/**
 * Bias Metrics Computation Engine
 * Computes fairness and bias metrics for a given dataset.
 */

/**
 * Compute Disparate Impact Ratio
 * DI = (P(favorable | unprivileged)) / (P(favorable | privileged))
 * A value of 1.0 = perfectly fair. < 0.8 or > 1.25 indicates potential bias.
 */
export function computeDisparateImpact(data, sensitiveCol, targetCol, favorableValue, privilegedValue) {
  const privileged = data.filter(row => String(row[sensitiveCol]).trim() === String(privilegedValue).trim());
  const unprivileged = data.filter(row => String(row[sensitiveCol]).trim() !== String(privilegedValue).trim());

  if (privileged.length === 0 || unprivileged.length === 0) return null;

  const privFavorable = privileged.filter(row => String(row[targetCol]).trim() === String(favorableValue).trim()).length;
  const unprivFavorable = unprivileged.filter(row => String(row[targetCol]).trim() === String(favorableValue).trim()).length;

  const privRate = privFavorable / privileged.length;
  const unprivRate = unprivFavorable / unprivileged.length;

  if (privRate === 0) return unprivRate === 0 ? 1.0 : Infinity;

  return unprivRate / privRate;
}

/**
 * Compute Statistical Parity Difference (Demographic Parity)
 * SPD = P(favorable | unprivileged) - P(favorable | privileged)
 * A value of 0 = perfectly fair. Negative = bias against unprivileged.
 */
export function computeStatisticalParityDifference(data, sensitiveCol, targetCol, favorableValue, privilegedValue) {
  const privileged = data.filter(row => String(row[sensitiveCol]).trim() === String(privilegedValue).trim());
  const unprivileged = data.filter(row => String(row[sensitiveCol]).trim() !== String(privilegedValue).trim());

  if (privileged.length === 0 || unprivileged.length === 0) return null;

  const privRate = privileged.filter(row => String(row[targetCol]).trim() === String(favorableValue).trim()).length / privileged.length;
  const unprivRate = unprivileged.filter(row => String(row[targetCol]).trim() === String(favorableValue).trim()).length / unprivileged.length;

  return unprivRate - privRate;
}

/**
 * Compute group-level selection rates for all values of a sensitive column
 */
export function computeGroupRates(data, sensitiveCol, targetCol, favorableValue) {
  const groups = {};

  data.forEach(row => {
    const groupVal = String(row[sensitiveCol]).trim();
    if (!groups[groupVal]) {
      groups[groupVal] = { total: 0, favorable: 0 };
    }
    groups[groupVal].total++;
    if (String(row[targetCol]).trim() === String(favorableValue).trim()) {
      groups[groupVal].favorable++;
    }
  });

  const result = {};
  Object.entries(groups).forEach(([key, val]) => {
    result[key] = {
      total: val.total,
      favorable: val.favorable,
      rate: val.total > 0 ? val.favorable / val.total : 0
    };
  });

  return result;
}

/**
 * Compute distribution of values in a column
 */
export function computeDistribution(data, col) {
  const counts = {};
  data.forEach(row => {
    const val = String(row[col]).trim();
    counts[val] = (counts[val] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({
      value,
      count,
      percentage: (count / data.length) * 100
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Auto-detect potentially sensitive columns based on column names
 */
export function detectSensitiveColumns(columns) {
  const sensitiveKeywords = [
    'gender', 'sex', 'race', 'ethnicity', 'age', 'religion',
    'nationality', 'disability', 'marital', 'color', 'origin',
    'native', 'country', 'married', 'male', 'female', 'ethnic',
    'immigration', 'citizen', 'veteran'
  ];

  return columns.filter(col => {
    const lower = col.toLowerCase().replace(/[_\-\.]/g, ' ');
    return sensitiveKeywords.some(kw => lower.includes(kw));
  });
}

/**
 * Auto-detect potential target/outcome columns
 */
export function detectTargetColumns(columns) {
  const targetKeywords = [
    'income', 'salary', 'outcome', 'result', 'decision', 'approved',
    'rejected', 'hired', 'label', 'class', 'target', 'prediction',
    'status', 'admitted', 'accepted', 'selected', 'score',
    'risk', 'default', 'loan', 'credit'
  ];

  return columns.filter(col => {
    const lower = col.toLowerCase().replace(/[_\-\.]/g, ' ');
    return targetKeywords.some(kw => lower.includes(kw));
  });
}

/**
 * Compute an overall fairness score (0-100)
 * Based on disparate impact and statistical parity
 */
export function computeFairnessScore(disparateImpact, statisticalParityDiff) {
  let score = 100;

  // Disparate impact penalty
  if (disparateImpact !== null && disparateImpact !== Infinity) {
    const diDeviation = Math.abs(1 - disparateImpact);
    score -= Math.min(diDeviation * 100, 50);
  }

  // Statistical parity penalty
  if (statisticalParityDiff !== null) {
    const spdDeviation = Math.abs(statisticalParityDiff);
    score -= Math.min(spdDeviation * 100, 50);
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get bias severity label
 */
export function getBiasSeverity(score) {
  if (score >= 80) return { label: 'Low Bias', level: 'good', description: 'The dataset shows minimal bias. Decisions appear largely fair.' };
  if (score >= 60) return { label: 'Moderate Bias', level: 'warning', description: 'Some bias detected. Review the flagged areas and consider mitigation.' };
  return { label: 'High Bias', level: 'danger', description: 'Significant bias detected. Immediate attention required before deployment.' };
}

/**
 * Run full bias analysis
 */
export function runFullAnalysis(data, sensitiveCol, targetCol, favorableValue, privilegedValue) {
  const disparateImpact = computeDisparateImpact(data, sensitiveCol, targetCol, favorableValue, privilegedValue);
  const statisticalParityDiff = computeStatisticalParityDifference(data, sensitiveCol, targetCol, favorableValue, privilegedValue);
  const groupRates = computeGroupRates(data, sensitiveCol, targetCol, favorableValue);
  const sensitiveDistribution = computeDistribution(data, sensitiveCol);
  const targetDistribution = computeDistribution(data, targetCol);
  const fairnessScore = computeFairnessScore(disparateImpact, statisticalParityDiff);
  const severity = getBiasSeverity(fairnessScore);

  return {
    disparateImpact,
    statisticalParityDiff,
    groupRates,
    sensitiveDistribution,
    targetDistribution,
    fairnessScore,
    severity,
    meta: {
      totalRows: data.length,
      sensitiveCol,
      targetCol,
      favorableValue,
      privilegedValue,
      timestamp: new Date().toISOString()
    }
  };
}
