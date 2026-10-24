const fs = require('fs');
const path = require('path');

const steps = [
  { order: 1, id: "numbers", title: "Числа" },
  { order: 2, id: "basic-operations", title: "Основные операции" },
  { order: 3, id: "expressions", title: "Выражения" },
  { order: 4, id: "substitutions", title: "Замены в выражениях" },
  { order: 5, id: "place-values", title: "Разряды для начинающих" },
  { order: 6, id: "multiplication", title: "Умножение" },
  { order: 7, id: "division", title: "Деление" },
  { order: 8, id: "order-of-operations", title: "Порядок действий" },
  { order: 9, id: "math-laws", title: "Законы математики" },
  { order: 10, id: "divisors-multiples", title: "Делители и кратные" },
  { order: 11, id: "gcd-lcm", title: "НОД и НОК" },
  { order: 12, id: "fractions", title: "Дроби" },
  { order: 13, id: "fraction-operations", title: "Действия с дробями" },
  { order: 14, id: "mixed-numbers", title: "Смешанные числа" },
  { order: 15, id: "comparing-fractions", title: "Сравнение дробей" },
  { order: 16, id: "units", title: "Единицы измерения" },
  { order: 17, id: "fraction-practice", title: "Практика по дробям" },
  { order: 18, id: "decimal-fractions", title: "Десятичные дроби" },
  { order: 19, id: "decimal-operations", title: "Действия с десятичными дробями" },
  { order: 20, id: "decimal-practice", title: "Практика по десятичным дробям" },
  { order: 21, id: "rounding", title: "Округление чисел" },
  { order: 22, id: "periodic-fractions", title: "Периодические дроби" },
  { order: 23, id: "unit-conversion", title: "Перевод единиц" },
  { order: 24, id: "ratios", title: "Соотношения" },
  { order: 25, id: "proportion", title: "Пропорция" },
  { order: 26, id: "distance-speed-time", title: "Расстояние, скорость, время" },
  { order: 27, id: "proportionality", title: "Прямая и обратная пропорциональность" },
  { order: 28, id: "percentages", title: "Проценты" },
  { order: 29, id: "negative-numbers", title: "Отрицательные числа" },
  { order: 30, id: "absolute-value", title: "Модуль числа" },
  { order: 31, id: "sets", title: "Что такое множество?" },
  { order: 32, id: "integer-add-sub", title: "Сложение и вычитание целых чисел" },
  { order: 33, id: "integer-mul-div", title: "Умножение и деление целых чисел" },
  { order: 34, id: "rational-numbers", title: "Рациональные числа" },
  { order: 35, id: "comparing-rational", title: "Сравнение рациональных чисел" },
  { order: 36, id: "rational-add-sub", title: "Сложение и вычитание рациональных чисел" },
  { order: 37, id: "rational-mul-div", title: "Умножение и деление рациональных чисел" },
  { order: 38, id: "advanced-fractions", title: "Дополнительные сведения о дробях" },
  { order: 39, id: "literal-expressions", title: "Буквенные выражения" },
  { order: 40, id: "factoring-out", title: "Вынесение общего множителя за скобки" },
  { order: 41, id: "expanding-brackets", title: "Раскрытие скобок" },
  { order: 42, id: "simple-word-problems", title: "Простейшие задачи по математике" },
  { order: 43, id: "fraction-word-problems", title: "Задачи на дроби" },
  { order: 44, id: "percentage-word-problems", title: "Задачи на проценты" },
  { order: 45, id: "motion-word-problems", title: "Задачи на движение" },
  { order: 46, id: "productivity", title: "Производительность" },
  { order: 47, id: "statistics-basics", title: "Элементы статистики" },
  { order: 48, id: "equations-basics", title: "Общие сведения об уравнениях" },
  { order: 49, id: "solving-with-equations", title: "Решение задач с помощью уравнений" },
  { order: 50, id: "solving-with-proportion", title: "Решение задач с помощью пропорции" },
  { order: 51, id: "linear-systems", title: "Системы линейных уравнений" },
  { order: 52, id: "inequalities-basics", title: "Общие сведения о неравенствах" },
  { order: 53, id: "linear-inequality-systems", title: "Системы линейных неравенств с одной переменной" },
  { order: 54, id: "set-operations", title: "Операции над множествами" },
  { order: 55, id: "natural-exponents", title: "Степень с натуральным показателем" },
  { order: 56, id: "integer-exponents", title: "Степень с целым показателем" },
  { order: 57, id: "perimeter-area-volume", title: "Периметр, площадь и объём" },
  { order: 58, id: "monomials", title: "Одночлены" },
  { order: 59, id: "polynomials", title: "Многочлены" },
  { order: 60, id: "short-multiplication", title: "Формулы сокращённого умножения" },
  { order: 61, id: "factorization", title: "Разложение многочлена на множители" },
  { order: 62, id: "polynomial-division", title: "Деление многочленов" },
  { order: 63, id: "polynomial-transformations", title: "Тождественные преобразования многочленов" },
  { order: 64, id: "square-root", title: "Квадратный корень" },
  { order: 65, id: "square-root-algorithm", title: "Алгоритм извлечения квадратного корня" },
  { order: 66, id: "quadratic-equation", title: "Квадратное уравнение" },
  { order: 67, id: "quadratic-even-coeff", title: "Квадратное уравнение с чётным вторым коэффициентом" },
  { order: 68, id: "vieta", title: "Теорема Виета" },
  { order: 69, id: "quadratic-factorization", title: "Разложение квадратного трёхчлена на множители" },
  { order: 70, id: "generalized-absolute", title: "Обобщённое понятие модуля числа" },
  { order: 71, id: "absolute-equations", title: "Уравнение с модулем" },
  { order: 72, id: "interval-method-equations", title: "Решение уравнений с модулем методом интервалов" },
  { order: 73, id: "absolute-inequalities", title: "Неравенства с модулем" },
  { order: 74, id: "interval-method-inequalities", title: "Решение неравенств с модулем методом интервалов" },
  { order: 75, id: "sqrt-both-sides", title: "Извлечение квадратного корня из обеих частей уравнения" }
];

const lessonsDir = path.join(__dirname, '..', 'content', 'lessons');
if (!fs.existsSync(lessonsDir)) {
  fs.mkdirSync(lessonsDir, { recursive: true });
}

for (const step of steps) {
  const fileName = `${String(step.order).padStart(2, '0')}-${step.id}.md`;
  const filePath = path.join(lessonsDir, fileName);
  const content = `# Шаг ${step.order}. ${step.title}\n\nСодержимое урока будет добавлено позже.\n`;
  fs.writeFileSync(filePath, content, 'utf-8');
}

console.log(`Created ${steps.length} lesson files in ${lessonsDir}`);