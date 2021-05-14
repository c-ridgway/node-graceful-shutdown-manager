# node-graceful-shutdown-manager

## Revision 2 - Modular approach

All in one solution to gracefully shutdown your application through a simple delayed shutdown process. Also allows code reloading and program restarting, instead of using a not so graceful process manager line nodemon.

Use for any node.js project which might be negatively impacted by immediate termination.

Locking is a mechanism which avoids beginning the shutdown process until a block of code has finished. Wrap important code such as file writing with `lock()` and `unlock()`. This will ensure no corruption occurs or resources are freed when they might be required. Ensure the code within the lock is synchronous. I recommend the `fs-extra` package for a drop-in fs promise replacement.

## Requirements

Autorestart on Windows will require bash added to the PATH environment variable, either through msys2 or WSL2.

## Module Functions

```javascript
// GSM Functions:
  gsm.exit() // Gracefully shutdown application by running free and then terminating the process.
  gsm.free() // Gracefully run free events, without exiting. (autoreload code, etc)
  gsm.isExiting() // Use when in a loop/long task, to avoid continuing
  gsm.isFreeing()

// Module Functions:
  base.lock() // Wait to free the object until it's unlocked again
  base.unlock()
  base.isLocked()
  base.setTimeout(funct, timeMs) // Locks the content, so it will not end the process until the body has finished executing
  base.setInterval(funct, timeMs) // Same as above
```

## Template Project
### Base your project around this pattern

https://github.com/c-ridgway/node-graceful-shutdown-manager/tree/main/example

```javascript
// Requires bash for autorestart/autoreload
npm run development
npm run production

// Doesn't require bash
npm run standalone
```

## FAQ

This project encompasses the app lifecycle, to break it down, it might be easier to explain what it does and does not do.

| Question | Answer |
| ------------- | ------------- |
| When does the app autoreload | Development mode, upon code changes |
| When does the app autorestart | Production mode, when the app crashes |
| How can I force close the app? | Press `ctrl + c` 5 times |
| Does this library support awaiting dependencies | Yes |
| In Windows won't it gracefully shutdown using `ctrl + c`? | The autorestart script loop tends to terminate for some reason. On Linux it'll work fine. Autoreload still gracefully shutsdown. |
| Can I use `process.exit()`? | Instead use `gsm.exit()`, this will gracefully exit when all modules have been freed |
| How do I check if the app is exiting? | Use `gsm.isFreeing()` or use `gsm.isExiting()`, especially in loops |
| What's a `Loader`? | It's a type of parent module to load modules from a directory (in the example) |
| What's a `Module`? | An object with lifecycle hooks `init()` `ready()` `free()` |
| Will my app free if it only partially initialises? | Yes, it will free all loaded modules. |
| Is this easy to integrate | Very easy, don't let the scaffolding fool you. This is mostly to ensure all lifecycle hooks and errors will be handled. |
| Can I create a self-contained `Loader` | Yes, create a folder with the name of the Loader you'd like to extend. |
