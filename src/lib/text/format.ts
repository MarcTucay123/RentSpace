export function capitalizeFirstLetter(value: string) {
  const firstLetterIndex = value.search(/\p{L}/u);
  if (firstLetterIndex === -1) return value;

  return `${value.slice(0, firstLetterIndex)}${value[firstLetterIndex].toLocaleUpperCase()}${value.slice(firstLetterIndex + 1)}`;
}