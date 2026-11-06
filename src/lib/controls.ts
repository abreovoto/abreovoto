/**
 * One construction for every form control (the state selector, the list's selects and
 * its search): 44 px tall, 2 px line border, radius 4, surface background, base text.
 * Shared from here so the four controls cannot drift apart.
 */
export const CONTROL = "block h-[44px] w-full rounded border-2 border-line bg-surface px-3.5 text-base font-normal text-fg";

/**
 * A select draws its own chevron instead of the native caret, which sat off the text's
 * baseline; `pr-11` keeps a long option clear of it.
 */
export const SELECT = `${CONTROL} select-chevron pr-11`;

/** The label sits 6 px above its control. */
export const FIELD = "flex flex-col gap-1.5 text-sm font-semibold leading-tight text-fg";
