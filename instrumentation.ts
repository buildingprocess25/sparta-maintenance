export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    const nodeInstrumentation = await import("@/instrumentation-node");
    await nodeInstrumentation.registerNodeErrorHooks();
}
