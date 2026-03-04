/**
 * BNM Manager approval list — re-uses BmcApprovalList since role-specific
 * rendering (APPROVED_BMC status, "Persetujuan Final" title, etc.) is
 * already handled inside that component via the `user.role` prop.
 */
export { BmcApprovalList as BnmApprovalList } from "./bmc-approval-list";
