export class Utils {
  static getEnv(variableName: string, defaultValue?: string) {
    const variable = process.env[variableName];
    if (!variable) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`${variableName} environment variable must be defined`);
    }
    return variable;
  }
}
