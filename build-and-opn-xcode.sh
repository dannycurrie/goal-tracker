npx expo prebuild --platform ios --clean
cd ios
pod install
cd ..
open ios/GoalTracker.xcworkspace