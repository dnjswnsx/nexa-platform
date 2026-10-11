export type ClassMetrics={id:string;name:string;students:number;capacity:number;projected:number;monthlyFee:number;plannedCost:number;plannedMargin:number;actualIncome:number;netGrowth:number;utilization:number};
export type Task={id:string;title:string;details:string;section:string;status:'todo'|'done';priority:'high'|'medium'|'low';due_at:string|null;assigned_user_id:string|null;assigned_name:string|null;source_key:string|null};
export type Brief={summary:string;actions:{title:string;reason:string;section:string;priority:'high'|'medium'|'low'}[];limitations:string[]};
export type Operations={
 tasks:Task[];members:{id:string;name:string}[];currency:string;classes:ClassMetrics[];
 summary:{projected:number;income:number;expenses:number;net:number;activeStudents:number};
 counts:{overdue:number;unanswered:number;inquiries:number;leads:number;upcoming:number};
 upcoming:{id:string;name:string;starts_at:string}[];
 suggestions:{key:string;title:string;titleKo:string;detail:string;detailKo:string;section:string;priority:'high'|'medium'|'low'}[];
 cashHistory:{month:string;income:number;expenses:number;entries:number}[];
 setup:{classes:boolean;students:boolean;knowledge:boolean;availability:boolean};
 ai:{configured:boolean;latest:{response:string;model:string;locale:string;created_at:string}|null};
};
