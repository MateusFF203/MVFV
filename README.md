# MVFV Installer (Windows)

This installer deploys the MVFV Node executor to `C:\MVFV` and adds `C:\MVFV` to the User `PATH`.

## Install

Run from PowerShell:

```powershell
cd MVFV-Language\installer
.\install-mvfv.bat
```

Optional flags:

- `-Force` overwrite existing `C:\MVFV\mvfv.bat` and `C:\MVFV\mvfv.js`
- `-SkipPath` install files without changing `PATH`
- `-InstallDir "C:\CustomDir"` install in another folder

Examples:

```powershell
.\install-mvfv.bat -Force
.\install-mvfv.bat -InstallDir "C:\Tools\MVFV" -SkipPath
```

## Uninstall

```powershell
cd MVFV-Language\installer
.\uninstall-mvfv.bat
```

Optional:

- `-RemoveFolder` remove the install folder too

Example:

```powershell
.\uninstall-mvfv.bat -RemoveFolder
```

## After install

Open a new terminal and run:

```powershell
mvfv help
```
