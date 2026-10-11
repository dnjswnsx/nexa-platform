// Shared deterministic arithmetic. This module contains no database or provider code.
export type ScenarioClass = {
 students: number; capacity: number; projected: number; monthlyFee: number; plannedCost: number;
};
export type Assumptions = { retention: number; newStudents: number; feeChange: number; extraCost: number };
export function calculateScenario(c: ScenarioClass, a: Assumptions) {
 for (const n of [c.students,c.capacity,c.projected,c.monthlyFee,c.plannedCost,a.retention,a.newStudents,a.feeChange,a.extraCost]) {
  if (!Number.isFinite(n)) throw new Error('Scenario values must be finite.');
 }
 if (c.students < 0 || c.capacity < c.students || c.projected < 0 || c.monthlyFee < 0 || c.plannedCost < 0 ||
     a.retention < 0 || a.retention > 100 || a.newStudents < 0 || !Number.isInteger(a.newStudents) ||
     a.feeChange < -20 || a.feeChange > 20 || a.extraCost < 0) throw new Error('Invalid scenario assumptions.');
 const retained = Math.round(c.students * a.retention / 100);
 const seats = c.capacity - retained;
 const acceptedNew = Math.min(a.newStudents, seats);
 const existingFees = c.students ? c.projected * retained / c.students : 0;
 const tuition = Math.round((existingFees + acceptedNew * c.monthlyFee) * (1 + a.feeChange / 100));
 const cost = c.plannedCost + Math.round(a.extraCost);
 const averageFee = c.students ? c.projected / c.students : c.monthlyFee;
 const adjustedAverage = averageFee * (1 + a.feeChange / 100);
 return {
  retained, acceptedNew, capped: acceptedNew < a.newStudents, students: retained + acceptedNew,
  seatsRemaining: seats - acceptedNew, tuition, cost, margin: tuition - cost,
  change: tuition - c.projected,
  breakEvenStudents: adjustedAverage > 0 ? Math.ceil(cost / adjustedAverage) : null,
 };
}
