/**
 * Type declarations for the Vite environment: lets TypeScript import `.vue` files as components.
 */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}
