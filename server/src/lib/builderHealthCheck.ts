export interface HealthCheckResult {
 status: 'ok';
}

export function builderHealthCheck(): HealthCheckResult {
 return {
   status: 'ok'
 };
}