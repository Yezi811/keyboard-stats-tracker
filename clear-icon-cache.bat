@echo off
echo ========================================
echo 清除 Windows 图标缓存
echo ========================================
echo.
echo 正在关闭 Windows 资源管理器...
taskkill /f /im explorer.exe

echo.
echo 正在删除图标缓存文件...
del /a /q "%localappdata%\IconCache.db" 2>nul
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*" 2>nul

echo.
echo 正在重启 Windows 资源管理器...
start explorer.exe

echo.
echo ========================================
echo 图标缓存已清除！
echo 请重新打开应用查看新图标。
echo ========================================
echo.
pause
