/**
 * Values from {@link Node} object (like `TEXT_NODE`).
 */

export const enum ChildNodeType {
	TextNode = 3,
	DocumentFragment = 11,
}

/**
 * Offsets of `Component.subscribers` array.
 *
 *
 *
 *
 * @example
 *
 * ```typescript
 * const subs = component.subs;
 *
 * const stateSubs = subs[ComponentSubsOffset.StateSubs];
 * const firstSub = subs[ComponentSubsOffset.FirstSub];
 * const lastSub = subs[ComponentSubsOffset.SubsQuantity];
 * ```
 */

export const enum ComponentSubsOffset {
	StateSubs,
	FirstSub,
	SubsQuantity,
}
