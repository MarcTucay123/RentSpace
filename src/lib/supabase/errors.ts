type DatabaseErrorLike = {
  code?: string;
  message?: string;
} | null;

export function isMissingDatabaseColumn(
  error: DatabaseErrorLike,
  tableName: string,
  columnName: string,
) {
  if (!error || !["42703", "PGRST204"].includes(error.code ?? "")) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes(tableName.toLowerCase()) && message.includes(columnName.toLowerCase());
}