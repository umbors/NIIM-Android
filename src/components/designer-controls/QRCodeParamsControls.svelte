<script lang="ts">
  import { QRCode } from "$/fabric-object/qrcode";

  interface Props {
    selectedQRCode: QRCode;
    editRevision: number;
    valueUpdated: () => void;
    hideContent?: boolean;
  }

  let { selectedQRCode, editRevision, valueUpdated, hideContent = false }: Props = $props();
</script>

<input type="hidden" value={editRevision} />

<div class="qr-param-grid">
  <label>
    <span>容错级别</span>
    <select
      value={selectedQRCode.ecl}
      onchange={(e) => {
        selectedQRCode?.set("ecl", e.currentTarget.value);
        valueUpdated();
      }}>
      <option value="L">L · 容量优先</option>
      <option value="M">M · 日常推荐</option>
      <option value="Q">Q · 更易识别</option>
      <option value="H">H · 最高容错</option>
    </select>
  </label>

  <label>
    <span>内容编码</span>
    <select
      value={selectedQRCode.mode}
      onchange={(e) => {
        selectedQRCode?.set("mode", e.currentTarget.value);
        valueUpdated();
      }}>
      <option value="Byte">通用文字</option>
      <option value="Numeric">纯数字</option>
      <option value="Alphanumeric">数字与字母</option>
      <option value="Kanji">日文汉字</option>
    </select>
  </label>

  <label>
    <span>二维码版本</span>
    <select
      value={selectedQRCode.qrVersion}
      onchange={(e) => {
        selectedQRCode?.set("qrVersion", parseInt(e.currentTarget.value));
        valueUpdated();
      }}>
      <option value={0}>自动选择</option>
      {#each { length: 40 }, i (i)}
        <option value={i + 1}>版本 {i + 1}</option>
      {/each}
    </select>
  </label>
</div>

{#if !hideContent}
  <label class="standalone-content">
    <span>二维码内容</span>
    <textarea
      value={selectedQRCode.text}
      oninput={(e) => {
        selectedQRCode?.set("text", e.currentTarget.value);
        valueUpdated();
      }}></textarea>
  </label>
{/if}

<style>
  .qr-param-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 8px;
  }

  label {
    display: grid;
    gap: 5px;
    color: #777b8b;
    font-size: 10px;
    font-weight: 700;
  }

  select,
  textarea {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid #dfe0e8;
    border-radius: 11px;
    outline: 0;
    color: #323541;
    background: #fff;
    font-size: 11px;
  }

  select:focus,
  textarea:focus {
    border-color: #968bf0;
    box-shadow: 0 0 0 3px rgba(101, 87, 232, 0.12);
  }

  .standalone-content {
    width: min(100%, 430px);
    margin-top: 8px;
  }

  .standalone-content textarea {
    min-height: 90px;
    resize: vertical;
  }

  @media (max-width: 580px) {
    .qr-param-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
