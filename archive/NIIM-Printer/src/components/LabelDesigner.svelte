<script lang="ts">
  import Dropdown from "bootstrap/js/dist/dropdown";
  import * as fabric from "fabric";
  import { onDestroy, onMount, tick } from "svelte";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import { appConfig, automation, connectionState, csvData, loadedFonts } from "$/stores";
  import {
    type ExportedLabelTemplate,
    type FabricJson,
    type LabelProps,
    type MoveDirection,
    type OjectType,
  } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { UndoRedo, type UndoState } from "$/utils/undo_redo";
  import BarcodeParamsPanel from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  import ArUcoParamsPanel from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import QrCodeParamsPanel from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import { DEFAULT_LABEL_PROPS, GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
  import { LabelDesignerUtils } from "$/utils/label_designer_utils";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import { CanvasUtils } from "$/utils/canvas_utils";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";

  let htmlCanvas: HTMLCanvasElement;

  let fabricCanvas = $state<CustomCanvas>();
  let labelProps = $state<LabelProps>(DEFAULT_LABEL_PROPS);
  let previewOpened = $state<boolean>(false);
  let selectedObject = $state<fabric.FabricObject | undefined>(undefined);
  let selectedCount = $state<number>(0);
  let editRevision = $state<number>(0);
  let selectedContent = $state<string>("");
  let printNow = $state<boolean>(false);
  let csvEnabled = $state<boolean>(false);
  let windowWidth = $state<number>(0);
  let undoState = $state<UndoState>({ undoDisabled: false, redoDisabled: false });
  let zoomText = $state<string>("100%");
  let toolDrawer = $state<"none" | "elements" | "more">("none");

  const undo = new UndoRedo();

  const discardSelection = () => {
    fabricCanvas!.discardActiveObject();
    fabricCanvas!.requestRenderAll();
    selectedObject = undefined;
    selectedCount = 0;
    editRevision = 0;
  };

  const loadLabelData = async (data: ExportedLabelTemplate) => {
    undo.paused = true;
    onUpdateLabelProps(data.label);
    if (data.csv) {
      $csvData = data.csv;
      csvEnabled = true;
    }
    await FileUtils.loadCanvasState(fabricCanvas!, data.canvas);
    undo.paused = false;
  };

  undo.onLabelUpdate = loadLabelData;
  undo.onStateUpdate = (state: UndoState) => {
    undoState = state;
  };

  const deleteSelected = () => {
    LabelDesignerUtils.deleteSelection(fabricCanvas!);
    discardSelection();
  };

  const cloneSelected = () => {
    LabelDesignerUtils.cloneSelection(fabricCanvas!).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const moveSelected = (direction: MoveDirection, ctrl?: boolean) => {
    LabelDesignerUtils.moveSelection(fabricCanvas!, direction, ctrl);
    undo.push(fabricCanvas!, labelProps);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key: string = e.key.toLowerCase();
    // windows and linux users are used to ctrl, mac users use cmd
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    // Esc
    if (key === "escape") {
      discardSelection();
      return;
    }

    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    // Arrows
    if (key.startsWith("arrow")) {
      moveSelected(key.slice("arrow".length) as MoveDirection, cmdOrCtrl);
      return;
    }

    if (e.repeat) {
      return;
    }

    // Ctrl + D
    if (cmdOrCtrl && key === "d") {
      e.preventDefault();
      cloneSelected();
      return;
    }

    // Ctrl + Y, Ctrl + Shift + Z
    if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && e.shiftKey && key === "z")) {
      e.preventDefault();
      if (!undoState.redoDisabled) {
        undo.redo();
      }
      return;
    }

    // Ctrl + Z
    if (cmdOrCtrl && key === "z") {
      e.preventDefault();
      if (!undoState.undoDisabled) {
        undo.undo();
      }
      return;
    }

    // Del
    if (key === "delete" || key === "backspace") {
      deleteSelected();
      return;
    }
  };

  const onUpdateLabelProps = (newProps: LabelProps) => {
    labelProps = newProps;
    fabricCanvas!.setDimensions(labelProps.size);
    fabricCanvas!.virtualZoom(fabricCanvas!.getVirtualZoom());
    try {
      LocalStoragePersistence.saveLastLabelProps(labelProps);
      undo.push(fabricCanvas!, labelProps);
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters save error:");
    }
  };

  const exportCurrentLabel = (): ExportedLabelTemplate => {
    return FileUtils.makeExportedLabel(fabricCanvas!, labelProps, csvEnabled);
  };

  const onLoadRequested = (label: ExportedLabelTemplate) => {
    loadLabelData(label).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const zplImageReady = async (img: Blob) => {
    await LabelDesignerObjectHelper.addImageBlob(fabricCanvas!, img);
    undo.push(fabricCanvas!, labelProps);
  };

  const pdfImageReady = async (el: HTMLCanvasElement) => {
    const img = new fabric.FabricImage(el, {
      ...OBJECT_DEFAULTS,
      left: 0,
      top: 0,
    });

    fabricCanvas!.add(img);
    fabricCanvas!.setActiveObject(img);
    undo.push(fabricCanvas!, labelProps);
  };

  const onObjectPicked = (objectType: OjectType) => {
    const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, objectType);
    if (obj !== undefined) {
      if (objectType === "text" && obj instanceof fabric.IText) {
        obj.set({ text: "双击编辑文字" });
      }
      if (objectType === "qrcode" && obj instanceof QRCode) {
        obj.set({ text: "https://niim.blue" });
      }
      fabricCanvas!.setActiveObject(obj);
      selectedContent = "text" in obj ? String(obj.text) : "";
      undo.push(fabricCanvas!, labelProps);
    }
  };

  const addQuickObject = (objectType: OjectType) => {
    onObjectPicked(objectType);
    toolDrawer = "none";
  };

  const addImage = async () => {
    try {
      const obj = await LabelDesignerObjectHelper.addImageWithFilePicker(fabricCanvas!);
      fabricCanvas!.setActiveObject(obj);
      undo.push(fabricCanvas!, labelProps);
      toolDrawer = "none";
    } catch (e) {
      console.debug("Image selection cancelled", e);
    }
  };

  const onIconPicked = (i: MaterialIcon) => {
    // todo: icon is not vertically centered
    LabelDesignerObjectHelper.addStaticText(fabricCanvas!, String.fromCodePoint(iconCodepoints[i]), {
      fontFamily: "Material Icons",
      fontSize: 100,
    });
    undo.push(fabricCanvas!, labelProps);
  };

  const onSvgIconPicked = (i: string) => {
    LabelDesignerObjectHelper.addSvg(fabricCanvas!, i);
    undo.push(fabricCanvas!, labelProps);
  };

  const openPreview = () => {
    printNow = false;
    previewOpened = true;
  };

  const openPreviewAndPrint = () => {
    printNow = true;
    previewOpened = true;
  };

  const controlValueUpdated = () => {
    if (selectedObject) {
      selectedObject.setCoords();
      selectedObject.dirty = true;
      undo.push(fabricCanvas!, labelProps);
    }
    fabricCanvas!.requestRenderAll();

    // trigger reactivity for controls
    editRevision++;
  };

  const updateSelectedContent = (value: string) => {
    const activeObject = fabricCanvas?.getActiveObject();
    if (!activeObject || !("text" in activeObject)) return;
    const target = activeObject as fabric.FabricObject & { text: string; isEditing?: boolean };
    target.set({ text: value });
    if ("isEditing" in target) target.isEditing = false;
    selectedContent = value;
    selectedObject = target;
    controlValueUpdated();
  };

  const applyQrTemplate = (template: "url" | "wifi" | "contact" | "text") => {
    const target = fabricCanvas?.getActiveObject();
    if (!target || target.type.toLowerCase() !== "qrcode") return;
    const templates = {
      url: "https://",
      wifi: "WIFI:T:WPA;S:WiFi名称;P:密码;;",
      contact: "BEGIN:VCARD\nVERSION:3.0\nFN:联系人姓名\nTEL:13800000000\nEND:VCARD",
      text: "在这里输入要分享的文字",
    };
    const qr = target as QRCode;
    qr.set({ text: templates[template] });
    selectedContent = templates[template];
    qr.dirty = true;
    qr.setCoords();
    fabricCanvas!.setActiveObject(qr);
    fabricCanvas!.requestRenderAll();
    selectedObject = qr;
    undo.push(fabricCanvas!, labelProps);
    editRevision++;
  };

  const getCanvasForPreview = (): FabricJson => {
    return fabricCanvas!.toJSON();
  };

  const onCsvPlaceholderPicked = (name: string) => {
    const obj = LabelDesignerObjectHelper.addText(fabricCanvas!, `{${name}}`, {
      textAlign: "left",
      originX: "left",
      originY: "top",
    });
    fabricCanvas!.setActiveObject(obj);
    undo.push(fabricCanvas!, labelProps);
  };

  const onPaste = async (event: ClipboardEvent) => {
    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    const openedDropdowns = document.querySelectorAll(".dropdown-menu.show");
    if (openedDropdowns.length > 0) {
      return;
    }

    if (event.clipboardData != null) {
      event.preventDefault();
      const obj = await LabelDesignerObjectHelper.addObjectFromClipboard(fabricCanvas!, event.clipboardData);

      if (obj !== undefined) {
        fabricCanvas!.setActiveObject(obj);
        undo.push(fabricCanvas!, labelProps);
      }
    }
  };

  const clearCanvas = () => {
    if (!confirm($tr("editor.clear.confirm"))) {
      return;
    }
    undo.push(fabricCanvas!, labelProps);
    fabricCanvas!.clear();
  };

  const toggleGrid = () => {
    const newVal = !$appConfig.gridEnabled;
    appConfig.update((cfg) => ({ ...cfg, gridEnabled: newVal }));
    fabricCanvas?.setGridEnabled(newVal);
  };

  const loadLabelFromUrl = async () => {
    try {
      const urlTemplate = await FileUtils.readLabelFromUrl();

      if (urlTemplate !== null && confirm($tr("params.saved_labels.load.url.warn"))) {
        onLoadRequested(urlTemplate);
        Toasts.message($tr("params.saved_labels.load.url.loaded"));
        return true;
      }
    } catch (e) {
      Toasts.error(e);
    }
    return false;
  }

  const loadDefaultLabel = async () => {
    const urlLoaded = await loadLabelFromUrl();

    if (urlLoaded) {
      return;
    }

    try {
      const defaultTemplate = LocalStoragePersistence.loadDefaultTemplate();

      if (defaultTemplate !== null) {
        onLoadRequested(defaultTemplate);
        return;
      }
    } catch (e) {
      Toasts.error(e);
    }

    LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
  };

  const renderOnFontsChanged = () => {
    fabricCanvas?.forEachObject((o) => {
      if (o instanceof fabric.Textbox) {
        o.dirty = true;
      }
    });
    fabricCanvas?.requestRenderAll();
  };

  onMount(async () => {
    try {
      const savedLabelProps = LocalStoragePersistence.loadLastLabelProps();
      if (savedLabelProps !== null) {
        labelProps = savedLabelProps;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters load error:");
    }

    fabricCanvas = new CustomCanvas(htmlCanvas, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });
    fabricCanvas.setLabelProps(labelProps);
    fabricCanvas.onZoomChange = (z) => {
      zoomText = Math.round(z * 100) + "%";
    };
    fabricCanvas.setGridEnabled(!!$appConfig.gridEnabled);

    await loadDefaultLabel();

    window.addEventListener("hashchange", loadLabelFromUrl);

    undo.push(fabricCanvas, labelProps);

    // force close dropdowns on touch devices
    fabricCanvas.on("mouse:down", (): void => {
      const dropdowns = document.querySelectorAll("[data-bs-toggle='dropdown']");
      dropdowns.forEach((el) => new Dropdown(el).hide());
    });

    fabricCanvas.on("object:moving", (e): void => {
      if (e.target && e.target.left !== undefined && e.target.top !== undefined) {
        e.target.set({
          left: Math.round(e.target.left / GRID_SIZE) * GRID_SIZE,
          top: Math.round(e.target.top / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    fabricCanvas.on("object:modified", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("text:changed", () => {
      const active = fabricCanvas!.getActiveObject();
      selectedContent = active && "text" in active ? String(active.text) : "";
      editRevision++;
    });

    fabricCanvas.on("object:removed", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("selection:created", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      selectedContent = selectedObject && "text" in selectedObject ? String(selectedObject.text) : "";
      editRevision++;
    });

    fabricCanvas.on("selection:updated", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      selectedContent = selectedObject && "text" in selectedObject ? String(selectedObject.text) : "";
      editRevision++;
    });

    fabricCanvas.on("selection:cleared", (): void => {
      selectedObject = undefined;
      selectedCount = 0;
      selectedContent = "";
      editRevision++;
    });

    fabricCanvas.on("dragover", (e): void => {
      e.e.preventDefault();
    });

    fabricCanvas.on("drop:after", async (e): Promise<void> => {
      const dragEvt = e.e as DragEvent;
      dragEvt.preventDefault();

      let dropped = false;

      if (dragEvt.dataTransfer?.files) {
        for (const file of dragEvt.dataTransfer.files) {
          try {
            await LabelDesignerObjectHelper.addImageFile(fabricCanvas!, file);
            dropped = true;
          } catch (e) {
            Toasts.error(e);
          }
        }

        if (dropped) {
          undo.push(fabricCanvas!, labelProps);
        }
      }
    });

    fabricCanvas.on("object:scaling", (e): void => {
      if (!e.target) {
        return;
      }

      CanvasUtils.fixFabricObjectScale(e.target);
    });

    // userFonts.subscribe((e) => {console.log(e); renderOnFontsChanged();});

    if ($automation !== undefined) {
      if ($automation.startPrint !== undefined) {
        if ($automation.startPrint === "immediately") {
          openPreview();
        } else if ($automation.startPrint === "after_connect") {
          const unsubscribe = connectionState.subscribe((st) => {
            if (st === "connected") {
              tick().then(() => unsubscribe());
              openPreviewAndPrint();
            }
          });
        }
      }
    }
  });

  onDestroy(() => {
    fabricCanvas!.dispose();
    window.removeEventListener("hashchange", loadLabelFromUrl);
  });

  $effect(() => {
    fabricCanvas?.setLabelProps(labelProps);
  });

  $effect(() => {
    if (!previewOpened) {
      printNow = false;
    }
  });

  $effect(() => {
    if ($loadedFonts) {
      renderOnFontsChanged();
    }
  });
</script>

<svelte:window bind:innerWidth={windowWidth} onkeydown={onKeyDown} onpaste={onPaste} />

<div class="editor-shell">
  <section class="workspace-card">
    <header class="workspace-header">
      <div>
        <span class="eyebrow">标签画布</span>
        <h1>设计你的标签</h1>
        <p>点按元素后，直接在下方编辑内容</p>
      </div>
      <div class="history-actions" aria-label="编辑历史">
        <button
          disabled={undoState.undoDisabled}
          onclick={() => undo.undo()}
          title={$tr("editor.undo")}
          aria-label="撤销">
          <MdIcon icon="undo" />
        </button>
        <button
          disabled={undoState.redoDisabled}
          onclick={() => undo.redo()}
          title={$tr("editor.redo")}
          aria-label="重做">
          <MdIcon icon="redo" />
        </button>
      </div>
    </header>

    <div class="canvas-stage">
      <div class="canvas-wrapper print-start-{labelProps.printDirection}" data-testid="label-canvas">
        <canvas bind:this={htmlCanvas}></canvas>
      </div>
    </div>

    <footer class="canvas-meta">
      <span><MdIcon icon="straighten" /> {labelProps.size.width} × {labelProps.size.height} px</span>
      <span class="meta-actions">
        <button
          class:active={$appConfig.gridEnabled}
          onclick={toggleGrid}
          title="显示网格"
          aria-label="显示网格">
          <MdIcon icon="grid_on" />
        </button>
        <button onclick={() => fabricCanvas?.resetVirtualZoom()} title="重置缩放">{zoomText}</button>
      </span>
    </footer>
  </section>

  {#if toolDrawer !== "none"}
    <section class="tool-drawer">
      <header>
        <div>
          <span class="eyebrow">{toolDrawer === "elements" ? "添加内容" : "画布与模板"}</span>
          <h2>{toolDrawer === "elements" ? "选择标签元素" : "更多工具"}</h2>
        </div>
        <button class="drawer-close" onclick={() => toolDrawer = "none"} aria-label="关闭">
          <MdIcon icon="close" />
        </button>
      </header>

      {#if toolDrawer === "elements"}
        <div class="element-grid">
          <button class="priority text" onclick={() => addQuickObject("text")}>
            <span><MdIcon icon="title" /></span>
            <strong>文字</strong>
            <small>标题、说明、变量</small>
          </button>
          <button class="priority qr" onclick={() => addQuickObject("qrcode")}>
            <span><MdIcon icon="qr_code_2" /></span>
            <strong>二维码</strong>
            <small>网址、Wi-Fi、联系卡</small>
          </button>
          <button onclick={() => addQuickObject("barcode")}>
            <span><MdIcon icon="view_week" /></span>
            <strong>条形码</strong>
            <small>商品与编号</small>
          </button>
          <button onclick={addImage}>
            <span><MdIcon icon="image" /></span>
            <strong>图片</strong>
            <small>相册或文件</small>
          </button>
          <button onclick={() => addQuickObject("line")}>
            <span><MdIcon icon="remove" /></span>
            <strong>线条</strong>
            <small>内容分隔</small>
          </button>
          <button onclick={() => addQuickObject("rectangle")}>
            <span><MdIcon icon="crop_square" /></span>
            <strong>矩形</strong>
            <small>边框与底色</small>
          </button>
          <button onclick={() => addQuickObject("circle")}>
            <span><MdIcon icon="radio_button_unchecked" /></span>
            <strong>圆形</strong>
            <small>标记与装饰</small>
          </button>
          <button onclick={() => addQuickObject("aruco")}>
            <span><MdIcon icon="grid_on" /></span>
            <strong>ArUco</strong>
            <small>视觉定位标记</small>
          </button>
        </div>

        <div class="import-tools">
          <span>专业格式导入</span>
          <ZplImportButton {labelProps} onImageReady={zplImageReady} />
          <PdfImportButton {labelProps} onImageReady={pdfImageReady} />
        </div>
      {:else}
        <div class="utility-section">
          <div class="utility-copy">
            <strong>标签规格</strong>
            <small>尺寸、方向、形状与 DPI</small>
          </div>
          <LabelPropsEditor {labelProps} onChange={onUpdateLabelProps} />
        </div>
        <div class="utility-section">
          <div class="utility-copy">
            <strong>模板管理</strong>
            <small>保存、打开与导入导出</small>
          </div>
          <SavedLabelsMenu
            canvas={fabricCanvas!}
            onRequestLabelTemplate={exportCurrentLabel}
            {onLoadRequested}
            {csvEnabled} />
        </div>
        <div class="utility-section">
          <div class="utility-copy">
            <strong>批量变量</strong>
            <small>从 CSV 批量生成标签</small>
          </div>
          <CsvControl bind:enabled={csvEnabled} onPlaceholderPicked={onCsvPlaceholderPicked} />
        </div>
        <div class="utility-section">
          <div class="utility-copy">
            <strong>图标素材</strong>
            <small>添加常用图形图标</small>
          </div>
          <IconPicker onSubmit={onIconPicked} onSubmitSvg={onSvgIconPicked} />
        </div>
        <button class="clear-canvas" onclick={clearCanvas}>
          <MdIcon icon="cancel_presentation" />
          清空当前画布
        </button>
      {/if}
    </section>
  {/if}

  {#if selectedCount > 0}
    <section class="properties-card" data-testid="properties-panel">
      <header class="properties-header">
        <div class="selection-title">
          <span class="selection-icon">
            {#if selectedObject instanceof QRCode}
              <MdIcon icon="qr_code_2" />
            {:else if selectedObject instanceof fabric.IText}
              <MdIcon icon="title" />
            {:else if selectedObject instanceof Barcode}
              <MdIcon icon="view_week" />
            {:else}
              <MdIcon icon="select_all" />
            {/if}
          </span>
          <div>
            <span class="eyebrow">当前选中</span>
            <h2>
              {#if selectedObject instanceof QRCode}
                二维码
              {:else if selectedObject instanceof fabric.IText}
                文字
              {:else if selectedObject instanceof Barcode}
                条形码
              {:else if selectedCount > 1}
                {selectedCount} 个元素
              {:else}
                图形元素
              {/if}
            </h2>
          </div>
        </div>
        <div class="selection-actions">
          <button onclick={cloneSelected} title="复制元素" aria-label="复制元素"><MdIcon icon="content_copy" /></button>
          <button class="danger" onclick={deleteSelected} title="删除元素" aria-label="删除元素"><MdIcon icon="delete" /></button>
        </div>
      </header>

      {#if selectedObject instanceof fabric.IText}
        <div class="content-editor text-content">
          <label for="mobile-text-content">
            <span>文字内容</span>
            <small>{selectedContent.length} 字</small>
          </label>
          <textarea
            id="mobile-text-content"
            data-testid="text-content"
            value={selectedContent}
            placeholder="输入要打印的文字"
            oninput={(e) => updateSelectedContent(e.currentTarget.value)}></textarea>
          <p><MdIcon icon="touch_app" /> 画布中也可以双击文字直接编辑</p>
        </div>

        <div class="control-block">
          <span class="control-label">文字样式</span>
          <div class="control-row text-controls">
            <TextParamsControls selectedText={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
          </div>
        </div>
      {:else if selectedObject instanceof QRCode}
        <div class="qr-presets">
          <span class="control-label">快速生成</span>
          <div>
            <button onclick={() => applyQrTemplate("url")}><MdIcon icon="link" />网址</button>
            <button onclick={() => applyQrTemplate("wifi")}><MdIcon icon="wifi" />Wi-Fi</button>
            <button onclick={() => applyQrTemplate("contact")}><MdIcon icon="contact_page" />联系人</button>
            <button onclick={() => applyQrTemplate("text")}><MdIcon icon="notes" />纯文字</button>
          </div>
        </div>

        <div class="content-editor qr-content">
          <label for="mobile-qr-content">
            <span>二维码内容</span>
            <small>{selectedContent.length} 字符</small>
          </label>
          <textarea
            id="mobile-qr-content"
            data-testid="qr-content"
            value={selectedContent}
            placeholder="输入网址、Wi-Fi 信息或任意文字"
            oninput={(e) => updateSelectedContent(e.currentTarget.value)}></textarea>
          <p><MdIcon icon="verified" /> 内容会实时生成，打印前可在预览中检查清晰度</p>
        </div>

        <div class="control-block">
          <span class="control-label">二维码清晰度</span>
          <div class="control-row qr-controls">
            <QrCodeParamsPanel selectedQRCode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} hideContent={true} />
          </div>
        </div>
      {:else if selectedObject instanceof Barcode}
        <div class="content-editor">
          <label for="mobile-barcode-content">
            <span>条码内容</span>
            <small>{selectedContent.length} 字符</small>
          </label>
          <input
            id="mobile-barcode-content"
            value={selectedContent}
            placeholder="输入商品编号"
            oninput={(e) => updateSelectedContent(e.currentTarget.value)} />
        </div>
        <div class="control-row">
          <BarcodeParamsPanel selectedBarcode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        </div>
      {:else if selectedObject instanceof ArUcoMarker}
        <div class="control-block">
          <span class="control-label">ArUco 标记参数</span>
          <div class="control-row">
            <ArUcoParamsPanel selectedArUco={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
          </div>
        </div>
      {/if}

      {#if selectedObject}
        <details class="advanced-controls">
          <summary><MdIcon icon="tune" /> 位置、大小与高级设置</summary>
          <div class="control-row">
            <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
            <VectorParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
          </div>
        </details>
      {/if}

      {#if selectedObject instanceof fabric.IText || selectedObject instanceof QRCode || (selectedObject instanceof Barcode && selectedObject.encoding === "CODE128B")}
        <div class="variable-row">
          <span>插入批量变量</span>
          <VariableInsertControl {selectedObject} valueUpdated={controlValueUpdated} />
        </div>
      {/if}
    </section>
  {:else}
    <section class="empty-selection">
      <span><MdIcon icon="touch_app" /></span>
      <div>
        <strong>先添加一个内容</strong>
        <p>推荐从文字或二维码开始，添加后会在这里显示清晰的编辑选项。</p>
      </div>
    </section>
  {/if}

  <nav class="bottom-tools" aria-label="标签编辑工具">
    <button class="quick-text" onclick={() => addQuickObject("text")} data-testid="add-text">
      <span><MdIcon icon="title" /></span>
      文字
    </button>
    <button class="quick-qr" onclick={() => addQuickObject("qrcode")} data-testid="add-qr">
      <span><MdIcon icon="qr_code_2" /></span>
      二维码
    </button>
    <button
      class:active={toolDrawer === "elements"}
      onclick={() => toolDrawer = toolDrawer === "elements" ? "none" : "elements"}
      aria-pressed={toolDrawer === "elements"}>
      <span><MdIcon icon="widgets" /></span>
      元素
    </button>
    <button
      class:active={toolDrawer === "more"}
      onclick={() => toolDrawer = toolDrawer === "more" ? "none" : "more"}
      aria-pressed={toolDrawer === "more"}>
      <span><MdIcon icon="more_horiz" /></span>
      更多
    </button>
    <button class="preview-action" onclick={openPreview}>
      <span><MdIcon icon="visibility" /></span>
      预览
    </button>
    <button
      class="print-action"
      onclick={openPreviewAndPrint}
      disabled={$connectionState !== "connected"}
      title={$connectionState === "connected" ? "打印标签" : "请先连接打印机"}>
      <span><MdIcon icon="print" /></span>
      打印
    </button>
  </nav>

  {#if previewOpened}
    <PrintPreview
      bind:show={previewOpened}
      canvasCallback={getCanvasForPreview}
      {labelProps}
      {printNow}
      {csvEnabled}
      csvData={$csvData.data} />
  {/if}
</div>

<style>
  .editor-shell {
    display: grid;
    gap: 14px;
    padding-bottom: 88px;
  }

  .workspace-card,
  .tool-drawer,
  .properties-card,
  .empty-selection {
    border: 1px solid rgba(35, 37, 51, 0.07);
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 14px 42px rgba(34, 36, 52, 0.06);
  }

  .workspace-header,
  .properties-header,
  .tool-drawer > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .workspace-header {
    padding: 18px 20px 14px;
  }

  .eyebrow,
  .control-label {
    display: block;
    color: #777b8d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 2px 0 0;
    color: #181a22;
    letter-spacing: -0.03em;
  }

  h1 {
    font-size: 21px;
    font-weight: 780;
  }

  h2 {
    font-size: 17px;
    font-weight: 760;
  }

  .workspace-header p {
    margin: 4px 0 0;
    color: #7d8191;
    font-size: 12px;
  }

  .history-actions,
  .selection-actions {
    display: flex;
    gap: 6px;
  }

  .history-actions button,
  .selection-actions button,
  .drawer-close {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    padding: 0;
    border: 1px solid #e7e8ee;
    border-radius: 12px;
    color: #4b4e5d;
    background: #f8f8fb;
  }

  .history-actions button:disabled {
    color: #b8bbc5;
    background: #f5f5f8;
  }

  .selection-actions .danger {
    color: #c74650;
    background: #fff2f3;
    border-color: #f7d8db;
  }

  .canvas-stage {
    display: grid;
    min-height: 230px;
    place-items: center;
    padding: 24px 16px;
    overflow: hidden;
    background:
      linear-gradient(90deg, rgba(111, 105, 154, 0.05) 1px, transparent 1px),
      linear-gradient(rgba(111, 105, 154, 0.05) 1px, transparent 1px),
      #f7f7fb;
    background-size: 20px 20px;
    border-top: 1px solid #ededf3;
    border-bottom: 1px solid #ededf3;
  }

  .canvas-wrapper {
    max-width: 100%;
    max-height: 56vh;
    overflow: auto;
    border: 1px solid rgba(28, 29, 37, 0.28);
    background: rgba(90, 87, 102, 0.22);
    box-shadow: 0 14px 40px rgba(37, 39, 53, 0.14);
  }

  .canvas-wrapper.print-start-left {
    border-left: 3px solid #ff625d;
  }

  .canvas-wrapper.print-start-top {
    border-top: 3px solid #ff625d;
  }

  .canvas-wrapper canvas {
    display: block;
    image-rendering: pixelated;
  }

  .canvas-meta {
    display: flex;
    min-height: 48px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    color: #747889;
    font-size: 11px;
  }

  .canvas-meta > span,
  .meta-actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .meta-actions button {
    min-width: 36px;
    height: 32px;
    padding: 0 8px;
    border: 0;
    border-radius: 9px;
    color: #626677;
    background: #f2f3f7;
    font-size: 11px;
    font-weight: 750;
  }

  .meta-actions button.active {
    color: #5141d5;
    background: #eceaff;
  }

  .tool-drawer,
  .properties-card {
    padding: 18px;
  }

  .tool-drawer > header,
  .properties-header {
    margin-bottom: 16px;
  }

  .element-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
  }

  .element-grid > button {
    display: grid;
    min-height: 104px;
    justify-items: start;
    align-content: center;
    gap: 3px;
    padding: 13px;
    border: 1px solid #e8e9ef;
    border-radius: 17px;
    color: #3e4251;
    background: #fbfbfd;
    text-align: left;
  }

  .element-grid > button > span {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    margin-bottom: 4px;
    border-radius: 11px;
    color: #5b4ddd;
    background: #eeecff;
    font-size: 19px;
  }

  .element-grid > button strong {
    font-size: 13px;
  }

  .element-grid > button small {
    color: #8a8e9c;
    font-size: 10px;
  }

  .element-grid > button.priority.text {
    border-color: #ffd7bc;
    background: #fff9f4;
  }

  .element-grid > button.priority.text > span {
    color: #d66b25;
    background: #ffeadb;
  }

  .element-grid > button.priority.qr {
    border-color: #d9d4ff;
    background: #f7f5ff;
  }

  .import-tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 12px;
    border-radius: 14px;
    color: #7b7f8f;
    background: #f7f7fa;
    font-size: 11px;
    font-weight: 700;
  }

  .utility-section {
    display: flex;
    min-height: 62px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px solid #ededf2;
  }

  .utility-copy {
    display: grid;
  }

  .utility-copy strong {
    color: #343744;
    font-size: 13px;
  }

  .utility-copy small {
    margin-top: 2px;
    color: #878b99;
    font-size: 10px;
  }

  .clear-canvas {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 14px;
    padding: 10px;
    border: 1px solid #f4d3d6;
    border-radius: 12px;
    color: #bb414a;
    background: #fff5f5;
    font-size: 12px;
    font-weight: 750;
  }

  .selection-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .selection-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    color: #594adb;
    background: #efedff;
    font-size: 21px;
  }

  .content-editor {
    padding: 14px;
    border: 1px solid #e6e7ed;
    border-radius: 16px;
    background: #fafafd;
  }

  .content-editor label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #383b49;
    font-size: 12px;
    font-weight: 750;
  }

  .content-editor label small {
    color: #9396a3;
    font-size: 10px;
    font-weight: 500;
  }

  .content-editor textarea,
  .content-editor input {
    width: 100%;
    min-height: 48px;
    padding: 12px;
    resize: vertical;
    border: 1px solid #dfe0e8;
    border-radius: 12px;
    outline: 0;
    color: #1d1f28;
    background: #fff;
    font-size: 15px;
    line-height: 1.5;
  }

  .content-editor textarea {
    min-height: 104px;
  }

  .content-editor textarea:focus,
  .content-editor input:focus {
    border-color: #978df1;
    box-shadow: 0 0 0 3px rgba(101, 87, 232, 0.12);
  }

  .content-editor p {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 8px 0 0;
    color: #888c9c;
    font-size: 10px;
  }

  .qr-presets {
    margin-bottom: 10px;
  }

  .qr-presets > div {
    display: flex;
    gap: 7px;
    margin-top: 7px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .qr-presets button {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;
    padding: 8px 11px;
    border: 1px solid #dedbeF;
    border-radius: 999px;
    color: #574ad0;
    background: #f5f3ff;
    font-size: 11px;
    font-weight: 700;
  }

  .control-block {
    margin-top: 14px;
  }

  .control-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
  }

  .advanced-controls {
    margin-top: 14px;
    padding: 0;
    border-top: 1px solid #ededf2;
  }

  .advanced-controls summary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 13px 0 0;
    color: #656979;
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    list-style: none;
  }

  .variable-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #ededf2;
    color: #737787;
    font-size: 11px;
  }

  .empty-selection {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 16px 18px;
  }

  .empty-selection > span {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 13px;
    color: #6557e8;
    background: #eeecff;
  }

  .empty-selection strong {
    font-size: 13px;
  }

  .empty-selection p {
    margin: 2px 0 0;
    color: #7f8392;
    font-size: 11px;
  }

  .bottom-tools {
    position: fixed;
    z-index: 90;
    right: 50%;
    bottom: max(10px, env(safe-area-inset-bottom));
    display: grid;
    width: min(calc(100% - 20px), 680px);
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    padding: 7px;
    transform: translateX(50%);
    border: 1px solid rgba(36, 38, 52, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 16px 50px rgba(27, 29, 42, 0.18);
    backdrop-filter: blur(18px);
  }

  .bottom-tools > button {
    display: grid;
    min-width: 0;
    min-height: 58px;
    place-items: center;
    align-content: center;
    gap: 2px;
    padding: 4px 2px;
    border: 0;
    border-radius: 15px;
    color: #696d7c;
    background: transparent;
    font-size: 9px;
    font-weight: 700;
  }

  .bottom-tools > button > span {
    font-size: 20px;
    line-height: 1;
  }

  .bottom-tools > button.active {
    color: #5445d5;
    background: #efedff;
  }

  .bottom-tools .quick-text {
    color: #c46122;
    background: #fff2e8;
  }

  .bottom-tools .quick-qr {
    color: #5647d8;
    background: #efedff;
  }

  .bottom-tools .print-action {
    color: #fff;
    background: #6557e8;
  }

  .bottom-tools .print-action:disabled {
    color: #9a9dab;
    background: #ececf1;
  }

  @media (min-width: 860px) {
    .editor-shell {
      grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
      align-items: start;
    }

    .workspace-card {
      grid-column: 1;
      grid-row: 1 / span 3;
    }

    .tool-drawer,
    .properties-card,
    .empty-selection {
      grid-column: 2;
    }

    .element-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .bottom-tools {
      position: sticky;
      grid-column: 2;
      right: auto;
      bottom: 12px;
      width: 100%;
      transform: none;
    }
  }

  @media (max-width: 620px) {
    .workspace-card,
    .tool-drawer,
    .properties-card,
    .empty-selection {
      border-radius: 20px;
    }

    .workspace-header {
      padding: 15px 15px 12px;
    }

    .workspace-header p {
      display: none;
    }

    .canvas-stage {
      min-height: 202px;
      padding: 22px 10px;
    }

    .tool-drawer,
    .properties-card {
      padding: 15px;
    }

    .element-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .element-grid > button {
      min-height: 92px;
    }

    .bottom-tools {
      width: calc(100% - 14px);
      padding: 6px;
      border-radius: 20px;
    }

    .bottom-tools > button {
      min-height: 54px;
      border-radius: 14px;
    }
  }

  @media (max-width: 370px) {
    .bottom-tools {
      grid-template-columns: repeat(5, 1fr);
    }

    .bottom-tools .preview-action {
      display: none;
    }
  }
</style>
