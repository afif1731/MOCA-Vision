export const ViolenceThresholdConfig = {
  USE_GLOBAL: process.env.USE_GLOBAL_VIOLENCE_THRESHOLD === 'true',
  GLOBAL: Number.parseFloat(
    process.env.VIOLENCE_GLOBAL_CONFIDENCE_THRESHOLD || '0.8',
  ),
  ASSAULT: Number.parseFloat(
    process.env.VIOLENCE_ASSAULT_CONFIDENCE_THRESHOLD || '0.7',
  ),
  FIGHTING: Number.parseFloat(
    process.env.VIOLENCE_FIGHTING_CONFIDENCE_THRESHOLD || '0.7',
  ),
  ROBBERY: Number.parseFloat(
    process.env.VIOLENCE_ROBBERY_CONFIDENCE_THRESHOLD || '0.8',
  ),
  SHOOTING: Number.parseFloat(
    process.env.VIOLENCE_SHOOTING_CONFIDENCE_THRESHOLD || '0.75',
  ),
};
