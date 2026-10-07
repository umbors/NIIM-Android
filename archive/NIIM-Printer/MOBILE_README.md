# Niim Pocket 手机标签 App

Niim Pocket 是基于 NiimBlue 打印协议与标签画布改造的手机优先版本。它保留蓝牙/USB 连接、标签编辑、模板、预览和打印能力，并把文字与二维码做成首页一级入口。

## 已完成的手机端体验

- 固定底部操作栏：文字、二维码、元素、更多、预览、打印。
- 文字编辑：大输入框、字数提示、对齐、粗体、斜体、字号、行距、字体、颜色、换行和自动适配。
- 二维码编辑：网址、Wi-Fi、联系人、纯文字快捷模板；内容实时更新；容错、编码与版本均可调整。
- 其他元素：条形码、图片、线条、矩形、圆形、ArUco，以及 ZPL/PDF 导入。
- 标签与模板：规格、DPI、方向、形状、保存、导入导出、CSV 批量变量。
- 打印：原生蓝牙连接、打印预览、浓度、份数、纸张类型、偏移与打印任务参数。
- 离线优先：标签和模板默认保存在设备本机。

## 安装 Android 测试版

工作区根目录中的 `Niim-Pocket-Android-debug.apk` 可直接安装到 Android 7.0 或更高版本。

1. 把 APK 发送到 Android 手机并打开。
2. 如果系统提示，请允许“安装未知应用”。
3. 启动 Niim Pocket，允许附近设备/蓝牙权限。
4. 点右上角“连接打印机”，选择 NIIMBOT 设备。

该 APK 使用 Android 调试证书签名，适合内部测试。正式发布到应用商店前，需要换成正式包名、应用图标和发布签名。

## 开发与验证

```bash
npm install
npm run dev
npm run sv-check
npm run lint
npm run build
```

Android 原生项目位于 `standalone-apps/capacitor/android`。更新网页代码后，先在 `standalone-apps/capacitor` 中运行 `npm run build-www` 和 `npx cap sync android`，再执行 Android Gradle 打包。

## 开源说明

本项目保留上游 NiimBlue 的 MIT 许可证与源码归属。核心打印通信由 `@mmote/niimbluelib` 提供。
