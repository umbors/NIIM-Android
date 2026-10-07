# Niim Pocket 手机标签 App

## 2026-09-10 更新（Android 0.1.2）

- 原生蓝牙扫描使用应用内列表，过滤无名及纯空白名称设备，按设备 ID 去重；取消选择或离开页面会停止扫描。
- 连接后读取耗材 RFID 产品编号，从 NIIMBOT 公共目录查询宽高和纸张类型；查询结果缓存到本机，换卷/开合纸仓时重新识别。只发送产品编号，不发送芯片序列号或标签内容。
- 按打印机 DPI 与出纸方向切换标签画布，等比调整已有内容；打印纸张类型优先使用耗材目录的 paperType，避免把材料代码当成纸张类型。
- 目录不可用、芯片未读到、耗材过宽时提示手动确认；线缆和多区域耗材暂不自动生成分区，不猜测其尺寸布局。初次识别需要联网。
- 新文字按字符换行，长文本限制在画布和邻近内容范围内；新增元素和副本优先寻找空白位置，空间不足时明确提示。
- 修复取消选中/耗材切换时位置面板销毁异常、数值输入无效、位置修改未进入撤销记录、小屏幕隐藏预览等问题。

验证：14 项排版/目录/蓝牙模拟测试，以及 320/390/768/1280 宽度下的实际浏览器交互检查通过。尚未在实体打印机上验证 RFID 和打印结果。

回归测试：启动开发服务于 5174 端口，安装 Playwright 后运行 `node tests/run-ui.mjs`（使用本机 Edge）。也可通过 `PLAYWRIGHT_MODULE` 指定已有 Playwright 模块的 file URL。

耗材目录接口依据：[上游协议研究](https://github.com/eigger/hass-niimbot/blob/master/docs/app-gap-analysis.md)，并用公开产品编号 02282280 实际核对了目录返回的 30 × 15 mm。

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
