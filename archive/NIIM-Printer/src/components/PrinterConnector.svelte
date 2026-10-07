<script lang="ts">
  import {
    NiimbotCapacitorBleClient,
    SoundSettingsItemType,
    Utils,
    type AvailableTransports,
  } from "@mmote/niimbluelib";
  import {
    printerClient,
    connectedPrinterName,
    connectionState,
    initClient,
    heartbeatData,
    printerInfo,
    printerMeta,
    heartbeatFails,
    automation,
    rfidInfo,
    ribbonRfidInfo,
    refreshRfidInfo,
  } from "$/stores";
  import type { ConnectionType } from "$/types";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { onMount } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { MaterialIcon } from "material-icons";
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  const onConnectClicked = async () => {
    initClient(connectionType);
    connectionState.set("connecting");

    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const onDisconnectClicked = () => $printerClient.disconnect();
  const startHeartbeat = async () => $printerClient.startHeartbeat();
  const stopHeartbeat = async () => $printerClient.stopHeartbeat();

  const soundOn = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, true);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, true);
  };

  const soundOff = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, false);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, false);
  };

  const fetchInfo = async () => $printerClient.fetchPrinterInfo();
  const reset = async () => $printerClient.abstraction.printerReset();

  const switchConnectionType = (type: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(type);
    connectionType = type;
  };

  const connectionIcon = (): MaterialIcon => connectionType === "serial" ? "usb" : "bluetooth";
  const connectionLabel = () => connectionType === "serial" ? "USB 串口" : "蓝牙";

  const batteryIcon = (value: number): MaterialIcon => {
    if (value > 4) value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    if (value === 4) return "battery_full";
    if (value === 3) return "battery_5_bar";
    if (value === 2) return "battery_3_bar";
    if (value === 1) return "battery_2_bar";
    return "battery_0_bar";
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();
    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";

    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") connectionType = "bluetooth";
    if (!featureSupport.webSerial && connectionType === "serial") connectionType = "bluetooth";
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) {
      connectionType = "capacitor-ble";
    }

    if ($automation !== undefined && $automation.autoConnect && connectionType === "capacitor-ble") {
      onConnectClicked();
    }
  });
</script>

<div class="connector">
  {#if $connectionState === "connected"}
    <button class="connected-pill" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-label="打印机详情">
      <span class="status-dot" class:warning={$heartbeatFails > 0}></span>
      <span class="connected-copy">
        <small>已连接</small>
        <strong>{$printerMeta?.model ?? $connectedPrinterName}</strong>
      </span>
      {#if $heartbeatData?.chargeLevel}
        <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90" />
      {/if}
      <MdIcon icon="expand_more" />
    </button>

    <div class="dropdown-menu dropdown-menu-end printer-menu p-3">
      <div class="menu-title">
        <span class="menu-icon"><MdIcon icon="print" /></span>
        <div>
          <strong>{$printerMeta?.model ?? $connectedPrinterName}</strong>
          <small>打印机在线，可立即打印</small>
        </div>
      </div>

      {#if $printerInfo}
        <details>
          <summary>设备信息</summary>
          <dl>
            {#each Object.entries($printerInfo) as [key, value] (key)}
              <div><dt>{key}</dt><dd>{value ?? "-"}</dd></div>
            {/each}
          </dl>
        </details>
      {/if}

      {#if $rfidInfo || $ribbonRfidInfo}
        <details>
          <summary>耗材与 RFID</summary>
          <button class="mini-action" onclick={refreshRfidInfo}>刷新耗材信息</button>
          <dl>
            {#each Object.entries($rfidInfo ?? {}) as [key, value] (key)}
              <div><dt>{key}</dt><dd>{value ?? "-"}</dd></div>
            {/each}
            {#each Object.entries($ribbonRfidInfo ?? {}) as [key, value] (key)}
              <div><dt>{key}</dt><dd>{value ?? "-"}</dd></div>
            {/each}
          </dl>
        </details>
      {/if}

      <details>
        <summary>设备维护</summary>
        <div class="maintenance-grid">
          <button onclick={fetchInfo}>刷新信息</button>
          <button onclick={startHeartbeat}>开启心跳</button>
          <button onclick={stopHeartbeat}>停止心跳</button>
          <button onclick={soundOn}>开启声音</button>
          <button onclick={soundOff}>关闭声音</button>
          <button onclick={reset}>重启设备</button>
        </div>
        <FirmwareUpdater />
      </details>

      <button class="disconnect-button" onclick={onDisconnectClicked}>
        <MdIcon icon="link_off" /> 断开打印机
      </button>
    </div>
  {:else}
    <div class="connect-group">
      <button
        class="connect-button"
        disabled={$connectionState === "connecting" ||
          (!featureSupport.capacitorBle && !featureSupport.webBluetooth && !featureSupport.webSerial)}
        onclick={onConnectClicked}>
        <MdIcon icon={connectionIcon()} />
        <span>{$connectionState === "connecting" ? "连接中…" : "连接打印机"}</span>
      </button>

      <button class="transport-button" data-bs-toggle="dropdown" aria-label="选择连接方式" title={connectionLabel()}>
        <MdIcon icon="expand_more" />
      </button>
      <div class="dropdown-menu dropdown-menu-end transport-menu p-2">
        <span class="menu-eyebrow">选择连接方式</span>
        {#if featureSupport.webBluetooth}
          <button class:active={connectionType === "bluetooth"} onclick={() => switchConnectionType("bluetooth")}>
            <MdIcon icon="bluetooth" />
            <span><strong>蓝牙</strong><small>手机端推荐</small></span>
            {#if connectionType === "bluetooth"}<MdIcon icon="check" />{/if}
          </button>
        {/if}
        {#if featureSupport.capacitorBle}
          <button class:active={connectionType === "capacitor-ble"} onclick={() => switchConnectionType("capacitor-ble")}>
            <MdIcon icon="bluetooth_connected" />
            <span><strong>App 蓝牙</strong><small>原生应用连接</small></span>
            {#if connectionType === "capacitor-ble"}<MdIcon icon="check" />{/if}
          </button>
        {/if}
        {#if featureSupport.webSerial}
          <button class:active={connectionType === "serial"} onclick={() => switchConnectionType("serial")}>
            <MdIcon icon="usb" />
            <span><strong>USB 串口</strong><small>有线连接</small></span>
            {#if connectionType === "serial"}<MdIcon icon="check" />{/if}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .connector,
  .connect-group {
    position: relative;
    display: flex;
    align-items: stretch;
  }

  .connect-button,
  .transport-button,
  .connected-pill {
    min-height: 42px;
    border: 0;
    color: white;
    background: #6557e8;
  }

  .connect-button {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px 0 14px;
    border-radius: 13px 0 0 13px;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .connect-button:disabled {
    color: #9295a3;
    background: #e9eaf0;
  }

  .transport-button {
    display: grid;
    width: 34px;
    place-items: center;
    padding: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 0 13px 13px 0;
  }

  .connected-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 210px;
    padding: 6px 10px;
    border: 1px solid #dcefe8;
    border-radius: 14px;
    color: #173d30;
    background: #f0fbf7;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #20b47a;
    box-shadow: 0 0 0 4px rgba(32, 180, 122, 0.12);
  }

  .status-dot.warning {
    background: #f0a22e;
  }

  .connected-copy {
    display: grid;
    min-width: 0;
    margin-right: auto;
    text-align: left;
    line-height: 1.05;
  }

  .connected-copy small {
    color: #5e8d7b;
    font-size: 9px;
  }

  .connected-copy strong {
    overflow: hidden;
    margin-top: 3px;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .printer-menu {
    width: min(350px, calc(100vw - 20px));
    border-radius: 20px;
  }

  .menu-title {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ececf2;
  }

  .menu-title > div:last-child {
    display: grid;
  }

  .menu-title small {
    color: #6f7485;
    font-size: 11px;
  }

  .menu-icon {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border-radius: 12px;
    color: #5849d9;
    background: #eeecff;
  }

  details {
    padding: 11px 0;
    border-bottom: 1px solid #efeff4;
  }

  summary {
    cursor: pointer;
    color: #3e4250;
    font-size: 13px;
    font-weight: 700;
  }

  dl {
    max-height: 180px;
    margin: 10px 0 0;
    overflow: auto;
    font-size: 11px;
  }

  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 3px 0;
  }

  dt { color: #7a7e8e; font-weight: 500; }
  dd { margin: 0; font-weight: 700; }

  .maintenance-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 7px;
    margin: 10px 0;
  }

  .maintenance-grid button,
  .mini-action {
    padding: 7px 8px;
    border: 1px solid #e1e2e9;
    border-radius: 9px;
    color: #505464;
    background: #f8f8fb;
    font-size: 11px;
  }

  .disconnect-button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 12px;
    padding: 10px;
    border: 0;
    border-radius: 11px;
    color: #bc3f49;
    background: #fff0f1;
    font-weight: 700;
  }

  .transport-menu {
    width: 260px;
    border-radius: 18px;
  }

  .menu-eyebrow {
    display: block;
    padding: 7px 9px 9px;
    color: #777b8b;
    font-size: 11px;
    font-weight: 700;
  }

  .transport-menu button {
    display: grid;
    width: 100%;
    grid-template-columns: 28px 1fr 20px;
    align-items: center;
    gap: 7px;
    padding: 9px;
    border: 0;
    border-radius: 11px;
    color: #454957;
    background: transparent;
    text-align: left;
  }

  .transport-menu button.active {
    color: #5041d2;
    background: #f0eeff;
  }

  .transport-menu button span {
    display: grid;
  }

  .transport-menu button small {
    color: #838797;
    font-size: 10px;
  }

  @media (max-width: 480px) {
    .connect-button {
      min-height: 38px;
      padding: 0 9px 0 11px;
      font-size: 12px;
    }

    .transport-button {
      width: 30px;
      min-height: 38px;
    }

    .connected-pill {
      max-width: 175px;
      min-height: 38px;
    }
  }

  @media (max-width: 360px) {
    .connect-button span {
      display: none;
    }

    .connect-button {
      padding: 0 10px;
    }
  }
</style>
