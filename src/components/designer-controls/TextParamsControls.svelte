<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import FontFamilyPicker from "$/components/designer-controls/FontFamilyPicker.svelte";
  import { TextboxExt } from "$/fabric-object/textbox-ext";

  interface Props {
    selectedText: fabric.IText;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedText, editRevision, valueUpdated }: Props = $props();

  let sizeMin: number = 1;
  let sizeMax: number = 999;

  const setXAlign = (align: fabric.TOriginX) => {
    selectedText.set({ textAlign: align });
    valueUpdated();
  };

  const setYAlign = (align: fabric.TOriginY) => {
    // change object origin, but keep position
    const pos = selectedText.getPointByOrigin("left", "top");
    selectedText.set({ originY: align });
    selectedText.setPositionByOrigin(pos, "left", "top");
    valueUpdated();
  };

  const toggleBold = () => {
    if (selectedText.fontWeight === "bold") {
      selectedText.fontWeight = "normal";
    } else {
      selectedText.fontWeight = "bold";
    }
    valueUpdated();
  };

  const toggleItalic = () => {
    if (selectedText.fontStyle === "italic") {
      selectedText.fontStyle = "normal";
    } else {
      selectedText.fontStyle = "italic";
    }
    valueUpdated();
  };

  const toggleFontAutoSize = () => {
    if (selectedText instanceof TextboxExt) {
      selectedText.set({ fontAutoSize: !selectedText.fontAutoSize });
    }
    valueUpdated();
  };

  const updateFontFamily = (v: string) => {
    selectedText.set({ fontFamily: v });
    valueUpdated();
  };

  const fontSizeUp = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.min(s > 40 ? Math.round(s * 1.1) : s + 2, sizeMax) });
    valueUpdated();
  };

  const fontSizeDown = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.max(s > 40 ? Math.round(s * 0.9) : s - 2, sizeMin) });
    valueUpdated();
  };

  const lineHeightChange = (v: number) => {
    v = Number.isFinite(v) ? Math.min(10, Math.max(0.5, v)) : 1;
    selectedText.set({ lineHeight: v });
    valueUpdated();
  };

  const fontSizeChange = (v: number) => {
    v = isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax);
    selectedText.set({ fontSize: v });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedText.set({ fill: value });
    valueUpdated();
  };

  const splitChanged = (value: string) => {
    if (selectedText instanceof fabric.Textbox) {
      selectedText.set({ splitByGrapheme: value === "grapheme" });
      valueUpdated();
    }
  };

  const backgroundColorChanged = (value: string) => {
    selectedText.set({ backgroundColor: value });
    valueUpdated();
  };

  const editInPopup = () => {
    const text = prompt($tr("params.text.edit.title"), selectedText.text);
    if (text !== null) {
      selectedText.set({ text });
      selectedText.isEditing = false;
      valueUpdated();
    }
  };


</script>

<!-- Keep the controls reactive when a different text object is selected. -->
<input type="hidden" value={editRevision} />

<div class="text-format-panel">
  <div class="format-group align-group">
    <span class="group-label">对齐</span>
    <div class="segmented">
      <button class:active={selectedText.textAlign === "left"} onclick={() => setXAlign("left")} title="左对齐">
        <MdIcon icon="format_align_left" /><small>左</small>
      </button>
      <button class:active={selectedText.textAlign === "center"} onclick={() => setXAlign("center")} title="居中">
        <MdIcon icon="format_align_center" /><small>中</small>
      </button>
      <button class:active={selectedText.textAlign === "right"} onclick={() => setXAlign("right")} title="右对齐">
        <MdIcon icon="format_align_right" /><small>右</small>
      </button>
    </div>
  </div>

  <div class="format-group style-group">
    <span class="group-label">字形</span>
    <div class="segmented">
      <button class:active={selectedText.fontWeight === "bold"} onclick={toggleBold} title="粗体">
        <MdIcon icon="format_bold" /><small>粗体</small>
      </button>
      <button class:active={selectedText.fontStyle === "italic"} onclick={toggleItalic} title="斜体">
        <MdIcon icon="format_italic" /><small>斜体</small>
      </button>
    </div>
  </div>

  <div class="format-group number-group">
    <span class="group-label">字号</span>
    <div class="stepper">
      <button onclick={fontSizeDown} title="减小字号"><MdIcon icon="remove" /></button>
      <input
        aria-label="字号"
        type="number"
        min={sizeMin}
        max={sizeMax}
        step="2"
        value={selectedText.fontSize}
        oninput={(e) => fontSizeChange(e.currentTarget.valueAsNumber)} />
      <button onclick={fontSizeUp} title="增大字号"><MdIcon icon="add" /></button>
    </div>
  </div>

  <label class="format-group line-height">
    <span class="group-label">行距</span>
    <input
      aria-label="行距"
      type="number"
      min="0.1"
      step="0.1"
      max="10"
      value={selectedText.lineHeight}
      oninput={(e) => lineHeightChange(e.currentTarget.valueAsNumber)} />
  </label>

  <div class="format-group font-family">
    <span class="group-label">字体</span>
    <FontFamilyPicker {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />
  </div>
</div>

<div class="extra-format">
  <div class="dropdown">
    <button class="format-chip dropdown-toggle" type="button" data-bs-toggle="dropdown">
      <MdIcon icon="vertical_align_center" /> 垂直位置
    </button>
    <div class="dropdown-menu p-2">
      <button class:active={selectedText.originY === "top"} onclick={() => setYAlign("top")}>
        <MdIcon icon="vertical_align_top" /> 顶部
      </button>
      <button class:active={selectedText.originY === "center"} onclick={() => setYAlign("center")}>
        <MdIcon icon="vertical_align_center" /> 居中
      </button>
      <button class:active={selectedText.originY === "bottom"} onclick={() => setYAlign("bottom")}>
        <MdIcon icon="vertical_align_bottom" /> 底部
      </button>
    </div>
  </div>

  <div class="dropdown">
    <button class="format-chip dropdown-toggle" type="button" data-bs-toggle="dropdown">
      <MdIcon icon="format_color_fill" /> 黑白颜色
    </button>
    <div class="dropdown-menu color-menu p-3">
      <label>
        <span>文字颜色</span>
        <select value={selectedText.fill} onchange={(e) => fillChanged(e.currentTarget.value)}>
          <option value="black">黑色</option>
          <option value="white">白色</option>
        </select>
      </label>
      <label>
        <span>文字底色</span>
        <select
          value={selectedText.backgroundColor || "transparent"}
          onchange={(e) => backgroundColorChanged(e.currentTarget.value)}>
          <option value="transparent">透明</option>
          <option value="white">白色</option>
          <option value="black">黑色</option>
        </select>
      </label>
    </div>
  </div>

  {#if selectedText instanceof fabric.Textbox}
    <div class="dropdown">
      <button class="format-chip dropdown-toggle" type="button" data-bs-toggle="dropdown">
        <MdIcon icon="wrap_text" /> 换行方式
      </button>
      <div class="dropdown-menu p-3 split-menu">
        <label>
          <span>自动换行</span>
          <select
            value={selectedText.splitByGrapheme ? "grapheme" : "space"}
            onchange={(e) => splitChanged(e.currentTarget.value)}>
            <option value="space">按单词或空格</option>
            <option value="grapheme">按单个字符</option>
          </select>
        </label>
      </div>
    </div>
  {/if}

  {#if selectedText instanceof TextboxExt}
    <button class="format-chip" class:active={selectedText.fontAutoSize} onclick={toggleFontAutoSize}>
      <MdIcon icon="fit_screen" /> 自动适配
    </button>
  {/if}

  <button class="format-chip" onclick={editInPopup}>
    <MdIcon icon="open_in_full" /> 大窗编辑
  </button>
</div>

<style>
  .text-format-panel {
    display: grid;
    width: 100%;
    grid-template-columns: 1.15fr 0.85fr 1.2fr 0.55fr;
    gap: 9px;
  }

  .format-group {
    display: grid;
    min-width: 0;
    align-content: start;
    gap: 5px;
  }

  .group-label {
    color: #7b7f8f;
    font-size: 9px;
    font-weight: 750;
  }

  .segmented,
  .stepper {
    display: flex;
    min-height: 42px;
    overflow: hidden;
    border: 1px solid #e0e1e8;
    border-radius: 11px;
    background: #fff;
  }

  .segmented button,
  .stepper button {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 5px 6px;
    border: 0;
    border-right: 1px solid #e8e9ef;
    color: #606474;
    background: transparent;
    font-size: 16px;
  }

  .segmented button:last-child,
  .stepper button:last-child {
    border-right: 0;
  }

  .segmented button.active {
    color: #fff;
    background: #686b79;
  }

  .segmented small {
    font-size: 8px;
  }

  .stepper input,
  .line-height input {
    width: 50px;
    min-width: 0;
    padding: 6px 2px;
    border: 0;
    outline: 0;
    color: #282b35;
    background: #fff;
    text-align: center;
    font-size: 12px;
    font-weight: 750;
  }

  .line-height input {
    width: 100%;
    min-height: 42px;
    padding: 8px;
    border: 1px solid #e0e1e8;
    border-radius: 11px;
  }

  .font-family {
    grid-column: 1 / -1;
  }

  .font-family :global(.input-group) {
    width: 100% !important;
  }

  .extra-format {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 9px;
  }

  .format-chip {
    display: flex;
    min-height: 34px;
    align-items: center;
    gap: 5px;
    padding: 6px 9px;
    border: 1px solid #e1e2e9;
    border-radius: 10px;
    color: #5f6372;
    background: #f8f8fb;
    font-size: 10px;
    font-weight: 700;
  }

  .format-chip.active {
    color: #5546d6;
    border-color: #d7d2ff;
    background: #efedff;
  }

  .dropdown-menu {
    min-width: 180px;
    border-radius: 14px;
  }

  .dropdown-menu button {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    color: #565a68;
    background: transparent;
    font-size: 11px;
  }

  .dropdown-menu button.active {
    color: #5041d0;
    background: #efedff;
  }

  .color-menu label,
  .split-menu label {
    display: grid;
    gap: 5px;
    margin-bottom: 9px;
    color: #747887;
    font-size: 10px;
    font-weight: 700;
  }

  .color-menu label:last-child {
    margin-bottom: 0;
  }

  .color-menu select,
  .split-menu select {
    min-height: 36px;
    padding: 6px 8px;
    border: 1px solid #dfe0e8;
    border-radius: 9px;
    background: #fff;
    font-size: 11px;
  }

  @media (max-width: 520px) {
    .text-format-panel {
      grid-template-columns: 1fr 0.8fr;
    }

    .number-group,
    .line-height {
      grid-row: 2;
    }
  }
</style>
