@echo off
echo ========================================
echo 键盘统计追踪器 - 发布准备脚本
echo ========================================
echo.

REM 检查 release 文件夹是否存在
if not exist "release" (
    echo [错误] release 文件夹不存在！
    echo 请先运行: npm run dist:win
    pause
    exit /b 1
)

REM 检查必要的文件是否存在
if not exist "release\Keyboard Stats Tracker Setup 1.0.0.exe" (
    echo [错误] 安装版文件不存在！
    pause
    exit /b 1
)

if not exist "release\Keyboard Stats Tracker 1.0.0.exe" (
    echo [错误] 便携版文件不存在！
    pause
    exit /b 1
)

echo [1/5] 创建发布文件夹...
if exist "release-package" (
    rmdir /s /q "release-package"
)
mkdir "release-package"
echo 完成！
echo.

echo [2/5] 复制安装版...
copy "release\Keyboard Stats Tracker Setup 1.0.0.exe" "release-package\" >nul
echo 完成！
echo.

echo [3/5] 复制便携版...
copy "release\Keyboard Stats Tracker 1.0.0.exe" "release-package\" >nul
echo 完成！
echo.

echo [4/5] 复制文档...
copy "FINAL_RELEASE.md" "release-package\README.txt" >nul
copy "USER_GUIDE.md" "release-package\" >nul
echo 完成！
echo.

echo [5/5] 计算文件哈希值...
echo.
echo 安装版 SHA256:
powershell -Command "Get-FileHash 'release-package\Keyboard Stats Tracker Setup 1.0.0.exe' -Algorithm SHA256 | Select-Object -ExpandProperty Hash"
echo.
echo 便携版 SHA256:
powershell -Command "Get-FileHash 'release-package\Keyboard Stats Tracker 1.0.0.exe' -Algorithm SHA256 | Select-Object -ExpandProperty Hash"
echo.

echo ========================================
echo 发布准备完成！
echo ========================================
echo.
echo 发布文件位置: release-package\
echo.
echo 包含文件:
dir /b "release-package"
echo.
echo 下一步:
echo 1. 测试两个版本的应用
echo 2. 创建 GitHub Release
echo 3. 上传文件和文档
echo.
pause
