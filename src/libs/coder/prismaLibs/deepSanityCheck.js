/**
 * Deep-sanity-check that the incoming schema is a superset of the existing one.
 *
 * @param {object} existingDMMF  – existing schema DMMF
 * @param {object} incomingDMMF  – incoming schema DMMF
 * @returns {string[]} Array of human-readable messages for every missing item.
 *                     Empty array → the incoming schema fully contains the existing one.
 */
/* ---------- Example usage inside compareSchemas() ---------- */
// deepSanityCheck(existingDMMF, incomingDMMF);
export function deepSanityCheck(existingDMMF, incomingDMMF) {
  const missing = {};
  const missingEnums = [];
  const missingModels = [];
  const missingGenerators = [];
  const missingDatasources = [];

  /* ---------- Enums ---------- */
  const getEnumMap = (dmmf) =>
    new Map(
      dmmf.datamodel.enums.map((e) => [
        e.name,
        new Set(e.values.map((v) => v.name)),
      ])
    );

  const existingEnums = getEnumMap(existingDMMF);
  const incomingEnums = getEnumMap(incomingDMMF);

  for (const [enumName, existingValues] of existingEnums.entries()) {
    const incomingValues = incomingEnums.get(enumName);

    if (!incomingValues) {
      missingEnums.push({
        value: null,
        name: enumName,
        message: `Enum ${enumName} is missing`,
      });
      continue;
    }

    for (const value of existingValues) {
      if (!incomingValues.has(value)) {
        missingEnums.push({
          value: value,
          name: enumName,
          message: `Enum ${enumName} is missing value ${value}`,
        });
      }
    }
  }

  /* ---------- Models ---------- */
  const getModelMap = (dmmf) =>
    new Map(
      dmmf.datamodel.models.map((m) => [
        m.name,
        new Set(m.fields.map((f) => f.name)),
      ])
    );

  const existingModels = getModelMap(existingDMMF);
  const incomingModels = getModelMap(incomingDMMF);

  for (const [modelName, existingFields] of existingModels.entries()) {
    const incomingFields = incomingModels.get(modelName);

    if (!incomingFields) {
      missingModels.push({
        value: null,
        name: modelName,
        message: `Model ${modelName} is missing`,
      });
      continue;
    }

    for (const field of existingFields) {
      if (!incomingFields.has(field)) {
        missingModels.push({
          value: field,
          name: modelName,
          message: `Model ${modelName} is missing field ${field}`,
        });
      }
    }
  }

  let isMissing = false;
  if (missingEnums.length > 0) {
    missing["enums"] = missingEnums;
    isMissing = true;
  }
  if (missingModels.length > 0) {
    missing["models"] = missingModels;
    isMissing = true;
  }

  return {
    isMissing: true,
    missing,
  };
}
