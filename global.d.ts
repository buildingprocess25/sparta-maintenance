declare module 'vitest';

declare module 'googleapis' {
  export const google: any;
  export namespace drive_v3 {
    export type Drive = any;
    export namespace Schema$File {
      export type Props = any;
    }
    export namespace Params$Resource$Files$List {
      export type Props = any;
    }
  }
}

declare module '@base-ui/react' {
  export const Combobox: any;
  export namespace Combobox {
    export namespace Value { export type Props = any; }
    export namespace Trigger { export type Props = any; }
    export namespace Clear { export type Props = any; }
    export namespace Input { export type Props = any; }
    export namespace Popup { export type Props = any; }
    export namespace Positioner { export type Props = any; }
    export namespace List { export type Props = any; }
    export namespace Item { export type Props = any; }
    export namespace Group { export type Props = any; }
    export namespace GroupLabel { export type Props = any; }
    export namespace Collection { export type Props = any; }
    export namespace Empty { export type Props = any; }
    export namespace Separator { export type Props = any; }
    export namespace Chips { export type Props = any; }
    export namespace Chip { export type Props = any; }
  }
}
