/**
 * One drag type, shared by the task rows and the mouse's burrow.
 *
 * A custom MIME type rather than plain text: it means the burrow only lights
 * up for things it can actually carry, and dropping a task onto the page
 * doesn't paste its id anywhere.
 */
export const TASK_DRAG = 'application/x-nook-task';
