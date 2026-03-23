#!/bin/bash
# Creates a custom DMG from the .app bundle built by Tauri.
# Uses hdiutil + AppleScript to set Finder view, icon positions, and layout.
# Run after: tauri build --bundles app  (or use: npm run build:mac)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAURI_CONF="$SCRIPT_DIR/../src-tauri/tauri.conf.json"
TARGET_DIR="${CARGO_TARGET_DIR:-$SCRIPT_DIR/../target}"
APP_PATH="$TARGET_DIR/release/bundle/macos/JobDex.app"
DMG_DIR="$TARGET_DIR/release/bundle/dmg"

if [ ! -d "$APP_PATH" ]; then
    echo "fix-dmg: $APP_PATH not found — run 'tauri build --bundles app' first"
    exit 1
fi

# Build DMG filename: JobDex_<version>_<arch>.dmg (matches Tauri's pattern)
VERSION=$(grep -o '"version": *"[^"]*"' "$TAURI_CONF" | head -1 | cut -d'"' -f4)
ARCH=$(uname -m)
mkdir -p "$DMG_DIR"
DMG_FILE="$DMG_DIR/JobDex_${VERSION}_${ARCH}.dmg"

# Remove any existing DMG with same name
[ -f "$DMG_FILE" ] && rm "$DMG_FILE"
echo "fix-dmg: creating $DMG_FILE"

# Eject any existing JobDex volumes to avoid "JobDex 2" naming
for vol in /Volumes/JobDex*; do
    [ -d "$vol" ] && hdiutil detach "$vol" -quiet 2>/dev/null || true
done

# Calculate size: app + 20MB headroom
APP_SIZE_MB=$(du -sm "$APP_PATH" | cut -f1)
DMG_SIZE_MB=$((APP_SIZE_MB + 20))

# 1. Create writable DMG
TEMP_DMG="${DMG_FILE%.dmg}_temp.dmg"
hdiutil create -size "${DMG_SIZE_MB}m" -fs HFS+ -volname "JobDex" "$TEMP_DMG"

# 2. Mount visible to Finder (no -nobrowse) so AppleScript can set icon positions
MOUNT_OUTPUT=$(hdiutil attach "$TEMP_DMG")
VOLPATH=$(echo "$MOUNT_OUTPUT" | sed -n 's/.*\(\/Volumes\/.*\)/\1/p' | tail -1)
VOLNAME=$(basename "$VOLPATH")
echo "fix-dmg: mounted at $VOLPATH (volume: $VOLNAME)"

# 3. Copy app and create Applications alias
cp -R "$APP_PATH" "$VOLPATH/"
osascript <<EOF
tell application "Finder"
    set targetFolder to POSIX file "$VOLPATH"
    set newAlias to make alias file to POSIX file "/Applications" at targetFolder
    set name of newAlias to "Applications"
end tell
EOF

# 4. Set window appearance via AppleScript (modeled after create-dmg's template)
echo "fix-dmg: configuring Finder view..."
osascript <<EOF
tell application "Finder"
    tell disk "$VOLNAME"
        open

        tell container window
            set current view to icon view
            set toolbar visible to false
            set statusbar visible to false
            set bounds to {200, 120, 800, 520}
        end tell

        set opts to the icon view options of container window
        tell opts
            set icon size to 128
            set text size to 12
            set arrangement to not arranged
        end tell

        -- Position ONLY visible items
        set position of item "JobDex.app" to {150, 180}
        set position of item "Applications" to {450, 180}

        close
        open
        delay 2
    end tell
end tell
EOF

# 5. Delete .fseventsd (auto-created by macOS on any HFS+ write)
rm -rf "$VOLPATH/.fseventsd"


# 6. Unmount
sync
echo "fix-dmg: Finder configuration done"
# Force Finder to finalize icon rendering
echo "fix-dmg: forcing Finder to resolve icons..."

# Open the volume in Finder (critical)
open "$VOLPATH"

# Give Finder time to render icons
sleep 3

# Force .DS_Store write
touch "$VOLPATH"

# Extra delay for safety
sleep 2
sleep 1
hdiutil detach "$VOLPATH" -quiet

# 7. Convert to compressed read-only UDZO
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_FILE" -quiet
rm "$TEMP_DMG"

echo "fix-dmg: done — $DMG_FILE"
