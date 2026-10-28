// Menú oficial de Kofi (SPEC-006, «Menú oficial»; D-2). El precio se escribe como en la interfaz y
// lo valida priceSchema al cargarlo. Una prueba lo compara con la tabla de spec.md (D-6).

export interface OfficialCategory {
  name: string;
  products: readonly { name: string; price: string }[];
}

export const OFFICIAL_MENU: readonly OfficialCategory[] = [
  {
    name: 'Cafés',
    products: [
      { name: 'Espresso', price: '10,00' },
      { name: 'Americano', price: '13,00' },
      { name: 'Cortado', price: '14,00' },
      { name: 'Café con leche', price: '15,00' },
      { name: 'Café filtrado de los Yungas', price: '16,00' },
      { name: 'Cappuccino', price: '18,00' },
      { name: 'Café latte', price: '18,00' },
      { name: 'Mocaccino', price: '22,00' },
    ],
  },
  {
    name: 'Otras bebidas calientes',
    products: [
      { name: 'Té', price: '8,00' },
      { name: 'Mate de coca', price: '8,00' },
      { name: 'Api morado', price: '8,00' },
      { name: 'Chocolate caliente', price: '16,00' },
      { name: 'Chai latte', price: '18,00' },
    ],
  },
  {
    name: 'Bebidas frías',
    products: [
      { name: 'Agua mineral', price: '6,00' },
      { name: 'Gaseosa personal', price: '8,00' },
      { name: 'Mocochinchi', price: '8,00' },
      { name: 'Café helado', price: '18,00' },
      { name: 'Frappé de café', price: '24,00' },
      { name: 'Frappé de moca', price: '26,00' },
    ],
  },
  {
    name: 'Jugos y licuados',
    products: [
      { name: 'Limonada', price: '10,00' },
      { name: 'Jugo de naranja', price: '14,00' },
      { name: 'Jugo de papaya', price: '14,00' },
      { name: 'Licuado de plátano con leche', price: '15,00' },
      { name: 'Licuado de frutilla con leche', price: '16,00' },
    ],
  },
  {
    name: 'Salados',
    products: [
      { name: 'Cuñapé', price: '4,00' },
      { name: 'Empanada de queso', price: '7,00' },
      { name: 'Salteña de pollo', price: '11,00' },
      { name: 'Salteña de carne', price: '11,00' },
      { name: 'Croissant de jamón y queso', price: '18,00' },
      { name: 'Sándwich de jamón y queso', price: '22,00' },
    ],
  },
  {
    name: 'Repostería',
    products: [
      { name: 'Alfajor de maicena', price: '6,00' },
      { name: 'Croissant', price: '10,00' },
      { name: 'Muffin de vainilla', price: '10,00' },
      { name: 'Brownie', price: '12,00' },
      { name: 'Rollo de canela', price: '12,00' },
      { name: 'Torta de chocolate (porción)', price: '18,00' },
      { name: 'Cheesecake de maracuyá', price: '22,00' },
    ],
  },
];
