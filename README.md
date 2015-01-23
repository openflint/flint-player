flint-player
============

Flint Player is the default media player for OpenFlint, developers can use it directly in their own video streaming sender app.


# How to use flint player
## Android App
```
    String applicationId = "~flintplayer"; // The ID is also defined in flint player 
    Flint.FlintApi.setApplicationId(applicationId);
    /* Launch the URL of flint player, you can also deploy the receiver app in your web server */
    Flint.FlintApi.launchApplication(mApiClient, "http://openflint.github.io/flint-player/player.html")
                .setResultCallback(
                        new ApplicationConnectionResultCallback("LaunchApp"));
```

## iOS App
```
    self.deviceManager =
    [[MSFKDeviceManager alloc] initWithDevice:self.selectedDevice
                           clientPackageName:appIdentifier];
    self.deviceManager.delegate = self;
    self.deviceManager.appId = @"~flintplayer"; // The ID is also defined in flint player 
    [self.deviceManager @"http://openflint.github.io/flint-player/player.html"
                        relaunchIfRunning:NO];
```

## Web App
```
    var senderManager = new FlintSenderManager('~flintplayer', '', true);
    var appInfo = {
        appUrl: "http://openflint.github.io/flint-player/player.html",
        useIpc: true,
        maxInactive: -1
    };
    senderManager.launch(appInfo, function (result, token) {})
```
