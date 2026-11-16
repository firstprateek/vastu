import { define } from '../core/define.js';
import { VaToast } from './toast.js';

export { VaToast };
export type { ToastDismissReason, ToastVariant } from './toast.js';

define('va-toast', VaToast);
