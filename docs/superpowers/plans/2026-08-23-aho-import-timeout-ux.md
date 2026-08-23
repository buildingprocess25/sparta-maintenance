# AHO Import Timeout UX Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a user-friendly timeout message when the AHO ticket import process hits Cloudflare's 100s timeout, assuring users the background process is still running.

**Architecture:** Add an `isTimeout` state to the `import-aho-tickets-dialog.tsx` component. In the `catch` block of the `handleImport` function, detect network/fetch errors (Cloudflare timeouts) and toggle the state to render a specific "Info" (blue) alert instead of a generic red error toast.

**Tech Stack:** React, Next.js, Tailwind, Lucide React

## Global Constraints

- Do not use Tailwind CSS colors outside the standard utility classes.
- Ensure the UI matches the current theme (use Info/Blue/Muted colors for the timeout state, avoiding red/error colors).
- Use Lucide React icons.

---

### Task 1: Add Timeout State and Modify Catch Block

**Files:**
- Modify: `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`

**Interfaces:**
- Consumes: The `catch` block inside `handleImport` which currently fires `toast.error`.
- Produces: An `isTimeout` state that controls the display of the timeout message.

- [ ] **Step 1: Add the `isTimeout` state**

Add `const [isTimeout, setIsTimeout] = useState(false);` alongside the other states (around line 37). Update `resetState` to also reset `setIsTimeout(false)`.

- [ ] **Step 2: Modify the `handleImport` catch block**

Replace the current generic `catch` block with logic to handle the timeout:

```tsx
            } catch (error) {
                // When Cloudflare times out (524), it typically throws a fetch/network error on the client
                setIsTimeout(true);
            } finally {
```

- [ ] **Step 3: Render the Timeout UI**

In the JSX, below the existing `result` UI, add a condition to render the timeout message when `isTimeout` is true.

```tsx
                    {isTimeout && !isPending && !result && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-sm text-blue-800">
                                    Memproses di Latar Belakang...
                                </span>
                            </div>
                            <p className="text-sm text-blue-700">
                                Karena ukuran data cukup besar, proses import sedang dilanjutkan oleh server di belakang layar. Anda bisa menutup jendela ini dan refresh halaman beberapa saat lagi.
                            </p>
                        </div>
                    )}
```

- [ ] **Step 4: Update the DialogFooter for the Timeout State**

Modify the buttons so the user can easily close the dialog when `isTimeout` is true, and hide the "Mulai Import" button.

```tsx
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOpen(false);
                            resetState();
                        }}
                    >
                        {result || isTimeout ? "Tutup" : "Batal"}
                    </Button>
                    {!result && !isTimeout && (
                        <Button
                            type="button"
                            disabled={!selectedFile || isPending}
                            onClick={handleImport}
                            className="gap-1.5"
                        >
                            <Upload className="h-4 w-4" />
                            Mulai Import
                        </Button>
                    )}
                </DialogFooter>
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx
git commit -m "feat(ui): add timeout ux handling for aho ticket imports"
```
