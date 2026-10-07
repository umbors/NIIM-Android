# NIIM Pocket 个人修改备份

本仓库于 2026-10-07 备份原 NIIM 工作目录，包含当前未提交的个人修改、`archive/NIIM-Printer` 历史源码、Web/Svelte 源码、Capacitor/Tauri 客户端、测试材料和两个已导出的 Android debug APK。

原项目来源：<https://github.com/MultiMote/niimblue>，原工作目录基线为 `8822a97c8a59e99a7f8d859de42a1e99c5c708d3`。保留上游 README、贡献说明及 MIT LICENSE（MultiMote）。本次没有改动业务源码，没有安装依赖、重新编译或执行硬件测试。

`docs/backup-files.json` 列出原目录中每个非 Git 元数据文件的大小、SHA-256 和 Git blob 校验值。生成依赖、构建目录、Gradle 缓存及由 Capacitor 复制的 Web 构建结果已先移至回收站，不进入源码备份。

根目录 `.env` 与历史副本 `.env` 仅含 Vite 页面标题、描述和部署 base URL 等非凭据配置，按原样保留。

恢复：克隆本仓库，在根目录根据 `package-lock.json` 执行 `npm ci`。Web 启动和构建见原 README；Android 构建顺序及工具链见 `MOBILE_README.md` 和 `standalone-apps/capacitor/README.md`。用实际打印机核对运行表现后再用于设备操作。
