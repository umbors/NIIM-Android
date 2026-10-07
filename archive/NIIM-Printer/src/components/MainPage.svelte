<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import { locale, locales, tr } from "$/utils/i18n";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;
  // eslint-disable-next-line no-undef
  const buildDate = __BUILD_DATE__;

  const isStandalone = Utils.getAvailableTransports().capacitorBle || "__TAURI__" in window;
  let debugStuffShow = $state<boolean>(false);
  let aboutOpen = $state<boolean>(false);
</script>

<div class="mobile-app" class:is-standalone={isStandalone}>
  <header class="app-header">
    <div class="brand" aria-label="Niim Pocket">
      <span class="brand-mark"><MdIcon icon="label" /></span>
      <span class="brand-copy">
        <strong>Niim Pocket</strong>
        <small>随身标签工作台</small>
      </span>
    </div>
    <PrinterConnector />
  </header>

  <main class="app-content">
    <BrowserWarning />
    <LabelDesigner />
  </main>

  <footer class="app-footer">
    <button class="about-trigger" onclick={() => aboutOpen = !aboutOpen} aria-expanded={aboutOpen}>
      <MdIcon icon="info" />
      关于与语言
      <MdIcon icon={aboutOpen ? "expand_less" : "expand_more"} />
    </button>

    {#if aboutOpen}
      <div class="about-panel">
        <label>
          <span>界面语言</span>
          <select class="form-select form-select-sm" bind:value={$locale}>
            {#each Object.entries(locales) as [key, name] (key)}
              <option value={key}>{name}</option>
            {/each}
          </select>
        </label>
        <p>基于开源 NiimBlue 打造，标签数据默认保存在本机。</p>
        <div class="meta-row">
          <span>
            {#if appCommit}
              <a href="https://github.com/MultiMote/niimblue/commit/{appCommit}">{appCommit.slice(0, 6)}</a>
            {/if}
            {$tr("main.built")} {buildDate}
          </span>
          <span>
            <a href="https://github.com/MultiMote/niimblue">{$tr("main.code")}</a>
            <button class="debug-button" onclick={() => debugStuffShow = true} aria-label="调试信息">
              <MdIcon icon="bug_report" />
            </button>
          </span>
        </div>
      </div>
    {/if}
  </footer>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}

<style>
  .mobile-app {
    min-height: 100dvh;
    background:
      radial-gradient(circle at 8% -10%, rgba(101, 87, 255, 0.14), transparent 30rem),
      #f6f7fb;
    color: #161820;
  }

  .app-header {
    position: sticky;
    z-index: 100;
    top: 0;
    display: flex;
    min-height: 72px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: max(12px, env(safe-area-inset-top)) max(16px, calc((100vw - 1180px) / 2));
    border-bottom: 1px solid rgba(28, 30, 42, 0.07);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 30px rgba(31, 34, 54, 0.05);
    backdrop-filter: blur(18px);
  }

  .brand {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .brand-mark {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 13px;
    color: white;
    background: linear-gradient(145deg, #6857ff, #503de7);
    box-shadow: 0 9px 18px rgba(83, 65, 224, 0.24);
    font-size: 21px;
  }

  .brand-copy {
    display: grid;
    line-height: 1.08;
  }

  .brand-copy strong {
    overflow: hidden;
    color: #181a22;
    font-size: 17px;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-copy small {
    margin-top: 4px;
    color: #777b8d;
    font-size: 11px;
  }

  .app-content {
    width: min(100%, 1180px);
    min-height: calc(100dvh - 150px);
    margin: 0 auto;
    padding: 18px 16px 36px;
  }

  .app-footer {
    width: min(calc(100% - 32px), 760px);
    margin: 0 auto;
    padding: 0 0 calc(110px + env(safe-area-inset-bottom));
    color: #7f8392;
  }

  .about-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 auto;
    padding: 8px 12px;
    border: 0;
    color: #7b7f8f;
    background: transparent;
    font-size: 12px;
  }

  .about-panel {
    margin-top: 8px;
    padding: 16px;
    border: 1px solid #e7e8ef;
    border-radius: 18px;
    background: white;
    font-size: 12px;
  }

  .about-panel label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: #444756;
    font-weight: 650;
  }

  .about-panel select {
    width: auto;
  }

  .about-panel p {
    margin: 14px 0 10px;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
  }

  .about-panel a {
    color: #6557e8;
  }

  .debug-button {
    padding: 0 2px;
    border: 0;
    color: inherit;
    background: transparent;
  }

  @media (max-width: 520px) {
    .app-header {
      min-height: 66px;
      padding-right: 12px;
      padding-left: 12px;
    }

    .brand-mark {
      width: 36px;
      height: 36px;
      border-radius: 12px;
    }

    .brand-copy strong {
      font-size: 15px;
    }

    .brand-copy small {
      display: none;
    }

    .app-content {
      padding: 12px 10px 28px;
    }
  }
</style>
