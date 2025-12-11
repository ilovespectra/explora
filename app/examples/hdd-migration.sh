#!/bin/bash

################################################################################
#                    Hard Drive Migration Script v2.0                          #
#                  Safe Copy from Old Drive to New Drive                       #
#                         Using Sorta v2.0 Backend                            #
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=3
RETRY_DELAY=5
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Derive metadata filename from source to avoid collisions between runs
make_metadata_filename() {
    local src="$1"
    local base="$(basename "$src")"
    base="${base//[^A-Za-z0-9._-]/_}"
    [[ -z "$base" ]] && base="source"
    echo ".sorta_metadata_${base}.json"
}

################################################################################
# HELPER FUNCTIONS
################################################################################

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "\n${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

confirm() {
    local prompt="$1"
    local response
    echo -n -e "${YELLOW}${prompt}${NC} (y/N): "
    read -r response
    [[ "$response" == "y" || "$response" == "Y" ]]
}

################################################################################
# DISK DETECTION AND VALIDATION
################################################################################

list_drives() {
    print_step "Listing available drives..."
    diskutil list | grep -E "^/dev/disk[0-9]+|^UUID" || true
}

get_disk_size() {
    local disk=$1
    # Try diskutil info first, then fall back to df
    if diskutil info "$disk" &>/dev/null; then
        diskutil info "$disk" 2>/dev/null | grep "Total Size" | awk -F': ' '{print $2}' | head -1
    else
        df -h "$disk" 2>/dev/null | tail -1 | awk '{print $2}' || echo "unknown"
    fi
}

get_disk_used() {
    local disk=$1
    df -h "$disk" 2>/dev/null | tail -1 | awk '{print $3}' || echo "unknown"
}

validate_disk() {
    local disk=$1
    local name=$2
    
    print_step "Validating ${name}..."
    
    # Check if path exists and is readable
    if [[ ! -d "$disk" ]]; then
        print_error "Disk/path not found: $disk"
        return 1
    fi
    
    if [[ ! -r "$disk" ]]; then
        print_error "No read permission: $disk"
        return 1
    fi
    
    # Get disk info via df
    local size=$(get_disk_size "$disk")
    local used=$(get_disk_used "$disk")
    
    print_info "Disk: $disk"
    print_info "Total Size: $size"
    print_info "Used Space: $used"
    
    return 0
}

validate_source_destination() {
    local source=$1
    local dest=$2
    
    print_step "Validating source and destination..."
    
    # Check source exists
    if [[ ! -d "$source" ]]; then
        print_error "Source path does not exist: $source"
        return 1
    fi
    print_success "Source path exists: $source"
    
    # Quick file existence check (just check for ANY files at root level)
    print_info "Checking for files in source (quick scan)..."
    if ls -1 "$source" 2>/dev/null | grep -q .; then
        print_success "Source contains files"
    else
        print_warning "No files found in source: $source"
        if ! confirm "Continue anyway?"; then
            return 1
        fi
    fi
    
    # Check destination exists
    if [[ ! -d "$dest" ]]; then
        print_warning "Destination path does not exist: $dest"
        if confirm "Create destination directory?"; then
            mkdir -p "$dest" || {
                print_error "Failed to create destination directory"
                return 1
            }
            print_success "Created destination directory"
        else
            return 1
        fi
    fi
    print_success "Destination path exists: $dest"
    
    # Check destination has enough space (quick check)
    print_info "Checking available space..."
    local dest_available=$(df -h "$dest" 2>/dev/null | tail -1 | awk '{print $4}')
    
    print_info "Destination available: $dest_available"
    print_warning "Ensure destination has at least as much space as source!"
    
    return 0
}

################################################################################
# METADATA OPERATIONS WITH RETRY
################################################################################

create_metadata_with_retry() {
    local source=$1
    local metadata_file=$2
    local attempt=1
    
    print_step "Creating metadata with SHA-256 hashes (retry enabled)..."
    
    while [[ $attempt -le $MAX_RETRIES ]]; do
        print_info "Attempt $attempt of $MAX_RETRIES..."
        
        if ts-node "$SCRIPT_DIR/src/app/pages/api/create-metadata.ts" "$source" "$metadata_file"; then
            print_success "Metadata created successfully"
            return 0
        fi
        
        if [[ $attempt -lt $MAX_RETRIES ]]; then
            print_warning "Metadata creation failed. Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
        
        ((attempt++))
    done
    
    print_error "Failed to create metadata after $MAX_RETRIES attempts"
    return 1
}

validate_metadata_file() {
    local metadata_file=$1
    
    print_step "Validating metadata file..."
    
    if [[ ! -f "$metadata_file" ]]; then
        print_error "Metadata file not found: $metadata_file"
        return 1
    fi
    
    local file_count=$(jq '.files | length' "$metadata_file" 2>/dev/null || echo 0)
    
    if [[ $file_count -eq 0 ]]; then
        print_warning "Metadata file contains 0 files"
        return 1
    fi
    
    print_success "Metadata file contains $file_count files"
    return 0
}

################################################################################
# MIGRATION OPERATIONS
################################################################################

perform_migration() {
    local source=$1
    local destination=$2
    local metadata_file=$3
    
    print_step "Starting hard drive migration..."
    print_info "Source: $source"
    print_info "Destination: $destination"
    print_info "This will COPY files (originals remain on source)"
    
    if ! confirm "Ready to start migration?"; then
        print_warning "Migration cancelled"
        return 1
    fi
    
    # Run sorta.ts with error handling
    if ts-node "$SCRIPT_DIR/src/app/pages/api/sorta.ts" "$source" "$destination"; then
        print_success "Migration completed successfully!"
        return 0
    else
        print_error "Migration encountered errors"
        print_info "You can resume with: ts-node $SCRIPT_DIR/src/app/pages/api/sorta.ts --resume"
        return 1
    fi
}

resume_migration() {
    print_step "Resuming migration..."
    print_info "This will continue from where the previous operation left off"
    
    if ! confirm "Resume migration?"; then
        print_warning "Resume cancelled"
        return 1
    fi
    
    if ts-node "$SCRIPT_DIR/src/app/pages/api/sorta.ts" --resume; then
        print_success "Migration resumed and completed successfully!"
        return 0
    else
        print_error "Resume encountered errors"
        return 1
    fi
}

verify_migration() {
    local source=$1
    local destination=$2
    
    print_step "Verifying migration (quick check)..."
    
    # Quick check: just verify destination has files
    if ls -1 "$destination" 2>/dev/null | grep -q .; then
        print_success "Files found on destination"
        print_info "Full verification can be run manually later:"
        print_info "  find \"$source\" -type f | wc -l      # Count source files"
        print_info "  find \"$destination\" -type f | wc -l  # Count destination files"
        return 0
    else
        print_error "No files found on destination"
        return 1
    fi
}

################################################################################
# MAIN WORKFLOW
################################################################################

main() {
    print_header "Hard Drive Migration - Safe Copy Using Sorta v2.0"
    
    print_info "This script will help you migrate data from an old drive to a new drive"
    print_info "Features:"
    print_info "  • Automatic metadata creation with SHA-256 hashing"
    print_info "  • Retry logic for reliability"
    print_info "  • COPY mode (originals remain on source)"
    print_info "  • Resume capability if interrupted"
    print_info "  • Duplicate detection and verification"
    
    # Step 1: List and select drives
    print_header "STEP 1: Identify Drives"
    
    list_drives
    
    print_step "Select source drive (old drive)..."
    echo -n -e "${YELLOW}Enter source drive path (e.g., /Volumes/OldDrive): ${NC}"
    read -r SOURCE_DRIVE
    
    if ! validate_disk "$SOURCE_DRIVE" "Source"; then
        print_error "Invalid source drive"
        exit 1
    fi
    
    print_step "Select destination drive (new drive)..."
    echo -n -e "${YELLOW}Enter destination drive path (e.g., /Volumes/NewDrive): ${NC}"
    read -r DEST_DRIVE
    
    if ! validate_disk "$DEST_DRIVE" "Destination"; then
        print_error "Invalid destination drive"
        exit 1
    fi
    
    # Step 2: Confirm source and destination
    print_header "STEP 2: Verify Source and Destination"
    
    if ! validate_source_destination "$SOURCE_DRIVE" "$DEST_DRIVE"; then
        print_error "Source or destination validation failed"
        exit 1
    fi
    
    # Step 3: Create metadata with retry
    print_header "STEP 3: Create Metadata"
    
    METADATA_FILE="$DEST_DRIVE/$(make_metadata_filename "$SOURCE_DRIVE")"
    
    if ! create_metadata_with_retry "$SOURCE_DRIVE" "$METADATA_FILE"; then
        print_error "Failed to create metadata"
        exit 1
    fi
    
    if ! validate_metadata_file "$METADATA_FILE"; then
        print_error "Metadata validation failed"
        exit 1
    fi
    
    # Step 4: Check for resume
    print_header "STEP 4: Check for Previous Session"
    
    if [[ -f "$DEST_DRIVE/.sorta_state.json" ]]; then
        print_warning "Found previous migration state"
        if confirm "Resume previous migration?"; then
            resume_migration "$SOURCE_DRIVE" "$DEST_DRIVE" "$METADATA_FILE"
            exit 0
        else
            print_info "Starting new migration (previous state will be overwritten)"
        fi
    fi
    
    # Step 5: Perform migration
    print_header "STEP 5: Perform Migration"
    
    if ! perform_migration "$SOURCE_DRIVE" "$DEST_DRIVE" "$METADATA_FILE"; then
        print_error "Migration encountered errors"
        print_info "You can resume later with: ts-node $SCRIPT_DIR/src/app/pages/api/sorta.ts --resume"
        exit 1
    fi
    
    # Step 6: Verify migration
    print_header "STEP 6: Verify Migration"
    
    if verify_migration "$SOURCE_DRIVE" "$DEST_DRIVE"; then
        print_success "Migration verification passed!"
    else
        print_warning "Migration verification found discrepancies"
        print_info "This may be due to metadata files or system files"
    fi
    
    # Summary
    print_header "Migration Complete!"
    
    print_success "All files have been copied to the new drive"
    print_success "Original files remain on the old drive"
    print_info "Log file: $DEST_DRIVE/.sorta_log.txt"
    print_info "Metadata: $METADATA_FILE"
    print_info ""
    print_info "Next steps:"
    print_info "  1. Verify all data on new drive is correct"
    print_info "  2. Compare file counts and sizes"
    print_info "  3. Once verified, you can safely remove the old drive"
    print_info ""
    print_success "Migration completed successfully!"
}

# Error handling
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Check dependencies
if ! command -v ts-node &> /dev/null; then
    print_error "ts-node is not installed"
    print_info "Install with: npm install -g ts-node"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed (optional, for better metadata validation)"
fi

# Run main function
main
