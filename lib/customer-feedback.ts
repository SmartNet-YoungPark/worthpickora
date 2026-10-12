export const FEEDBACK_KINDS={happy:"Happy with the experience",problem:"Something went wrong",suggestion:"Suggestion"} as const;
export type FeedbackKind=keyof typeof FEEDBACK_KINDS;
export type Feedback={id:string;created_at:string;display_name:string;sentiment:FeedbackKind;message:string;status:"pending"|"visible"|"hidden";reply:string;replied_at:string|null};
export const feedbackId=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validFeedback(value:unknown):value is {id:string;name:string;sentiment:FeedbackKind;message:string}{
 if(!value||typeof value!=="object")return false;
 const b=value as Record<string,unknown>;
 return feedbackId(b.id)&&typeof b.name==="string"&&b.name.trim().length>=1&&b.name.trim().length<=60&&typeof b.message==="string"&&b.message.trim().length>=5&&b.message.trim().length<=1500&&typeof b.sentiment==="string"&&Object.hasOwn(FEEDBACK_KINDS,b.sentiment);
}
