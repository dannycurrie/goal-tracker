# 1. Close Xcode completely first (important!)

# 2. Remove all generated iOS files and caches
rm -rf ios
rm -rf node_modules
rm -rf .expo

# 3. Clear Xcode derived data for this project
rm -rf ~/Library/Developer/Xcode/DerivedData/*goaltracker*

# 4. Clear Metro cache
rm -rf $TMPDIR/metro-*

# 5. Reinstall node modules
npm install

# 6. Regenerate the iOS project
npx expo prebuild --platform ios --clean

# 7. Install pods
cd ios
pod install
cd ..