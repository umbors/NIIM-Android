<script lang="ts">
  import { BleClient } from "@capacitor-community/bluetooth-le";
  import { onDestroy } from "svelte";
  let devices = $state<{ id: string; name: string }[]>([]);
  let opened = $state(false);
  let message = $state("");
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveChoice: ((id: string | undefined) => void) | undefined;
  let dialog: HTMLDialogElement;
  $effect(() => { if (opened) dialog?.showModal(); else dialog?.close(); });
  async function stop() {
    clearTimeout(timer);
    if (running) {
      running = false;
      await BleClient.stopLEScan().catch(() => {});
    }
  }
  async function finish(id?: string) {
    opened = false;
    await stop();
    resolveChoice?.(id);
    resolveChoice = undefined;
  }
  export async function choose(): Promise<string | undefined> {
    await BleClient.initialize({ androidNeverForLocation: true });
    if (!await BleClient.isEnabled()) throw new Error("请先开启手机蓝牙");
    devices = [];
    opened = true;
    message = "正在扫描，只显示有名称的设备…";
    const choice = new Promise<string | undefined>((resolve) => { resolveChoice = resolve; });
    running = true;
    try {
      await BleClient.requestLEScan({ allowDuplicates: true }, (result) => {
        if (!opened || !running) return;
        const name = result.localName?.trim() || result.device.name?.trim() || "";
        if (!name) return;
        const entry = { id: result.device.deviceId, name };
        devices = [...devices.filter((device) => device.id !== entry.id), entry]
          .sort((a, b) => a.name.localeCompare(b.name));
      });
      if (!opened) await BleClient.stopLEScan().catch(() => {});
      else timer = setTimeout(() => {
        void stop();
        message = devices.length ? "扫描结束，请选择打印机" : "未发现有名称的设备，请开启打印机后重试";
      }, 12000);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
      await stop();
    }
    return choice;
  }
  onDestroy(() => { void finish(); });
</script>

    <dialog bind:this={dialog} aria-label="选择蓝牙打印机" oncancel={(event) => { event.preventDefault(); void finish(); }}>
      <h2>选择蓝牙打印机</h2>
      <p role="status">{message}</p>
      <div class="device-list">
        {#each devices as device (device.id)}
          <button onclick={() => finish(device.id)}>{device.name}</button>
        {/each}
      </div>
      <button class="cancel" onclick={() => finish()}>取消</button>
    </dialog>
<style>
  dialog::backdrop { background: #15182788; }
  dialog { width: min(calc(100% - 32px), 420px); max-height: 80dvh; overflow: auto; background: white; border: 0; border-radius: 20px; padding: 20px; }
  h2 { font-size: 19px; }
  p { font-size: 13px; color: #626677; }
  .device-list { display: grid; gap: 8px; }
  button { min-height: 46px; border: 1px solid #dedbea; background: #f5f3ff; border-radius: 12px; padding: 10px; overflow-wrap: anywhere; }
  .cancel { width: 100%; margin-top: 16px; background: white; }
</style>
