require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

// Force public DNS for Atlas SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/riser';

const categories = [
  { name: 'Burgers', description: 'Juicy burgers made fresh', logo_url: '' },
  { name: 'Pizza', description: 'Hand-tossed pizzas with premium toppings', logo_url: '' },
  { name: 'Cold Drinks', description: 'Refreshing beverages', logo_url: '' },
  { name: 'Sides & Breads', description: 'Fries, garlic breads and more', logo_url: '' },
  { name: 'Desserts', description: 'Sweet treats to end your meal', logo_url: '' },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Admin user
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@riser.com',
    password_hash: 'Admin@1234',
    role: 'admin',
  });
  const regularUser = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    password_hash: 'User@1234',
    role: 'user',
  });
  console.log('Created users: admin@riser.com / Admin@1234 | john@example.com / User@1234');

  // Categories
  const cats = await Category.insertMany(categories);
  console.log(`Created ${cats.length} categories`);

  const burgers = cats[0];
  const pizza = cats[1];
  const drinks = cats[2];
  const sides = cats[3];
  const desserts = cats[4];

  const products = [
    // ── Burgers (22) — enough to show 2 pages of pagination ─────────────────
    { title: 'Classic Cheeseburger',    description: 'Beef patty with cheddar, lettuce, tomato & pickles', cost: 129, tax_percent: 5, category_id: burgers._id, stock_qty: 50, addons: [{ name: 'Extra Cheese', price: 20 }, { name: 'Bacon', price: 30 }], image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { title: 'Spicy Chicken Burger',    description: 'Crispy fried chicken with jalapeño sauce',           cost: 149, tax_percent: 5, category_id: burgers._id, stock_qty: 40, addons: [{ name: 'Extra Sauce', price: 10 }],                               image_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500' },
    { title: 'Double Smash Burger',     description: 'Two smashed beef patties with special sauce',        cost: 199, tax_percent: 5, category_id: burgers._id, stock_qty: 30, addons: [{ name: 'Egg', price: 25 }, { name: 'Avocado', price: 35 }],      image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500' },
    { title: 'BBQ Bacon Burger',        description: 'Smoky BBQ sauce, crispy bacon & onion rings',       cost: 179, tax_percent: 5, category_id: burgers._id, stock_qty: 35, addons: [{ name: 'Jalapeños', price: 15 }],                                image_url: 'https://images.unsplash.com/photo-1596662951482-0bc0ca62e1f2?w=500' },
    { title: 'Veggie Delight Burger',   description: 'Black bean patty with fresh guacamole',             cost: 119, tax_percent: 5, category_id: burgers._id, stock_qty: 40, addons: [{ name: 'Vegan Cheese', price: 20 }],                             image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=500' },
    { title: 'Mushroom Swiss Burger',   description: 'Sautéed mushrooms with melted Swiss cheese',        cost: 159, tax_percent: 5, category_id: burgers._id, stock_qty: 25, addons: [{ name: 'Truffle Sauce', price: 30 }],                           image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500' },
    { title: 'Fish & Cheese Burger',    description: 'Crispy fish fillet with tartar sauce',              cost: 139, tax_percent: 5, category_id: burgers._id, stock_qty: 20, addons: [],                                                                image_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500' },
    { title: 'Teriyaki Burger',         description: 'Japanese teriyaki glazed chicken with coleslaw',    cost: 169, tax_percent: 5, category_id: burgers._id, stock_qty: 30, addons: [{ name: 'Extra Teriyaki', price: 15 }],                           image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500' },
    { title: 'Truffle Burger',          description: 'Premium beef with truffle mayo & arugula',          cost: 229, tax_percent: 5, category_id: burgers._id, stock_qty: 18, addons: [{ name: 'Extra Truffle', price: 40 }],                           image_url: 'https://images.unsplash.com/photo-1612392062442-4e5aa0c5fa89?w=500' },
    { title: 'Korean BBQ Burger',       description: 'Gochujang-marinated beef with kimchi slaw',         cost: 189, tax_percent: 5, category_id: burgers._id, stock_qty: 22, addons: [{ name: 'Extra Kimchi', price: 20 }],                            image_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500' },
    { title: 'Breakfast Burger',        description: 'Beef patty topped with egg, bacon & hash brown',    cost: 169, tax_percent: 5, category_id: burgers._id, stock_qty: 28, addons: [{ name: 'Extra Egg', price: 20 }],                               image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500' },
    { title: 'Ranch Chicken Burger',    description: 'Grilled chicken with creamy ranch & pickles',       cost: 149, tax_percent: 5, category_id: burgers._id, stock_qty: 32, addons: [{ name: 'Extra Ranch', price: 10 }],                             image_url: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=500' },
    { title: 'Pulled Pork Burger',      description: 'Slow-cooked pulled pork with smoky BBQ sauce',     cost: 199, tax_percent: 5, category_id: burgers._id, stock_qty: 20, addons: [{ name: 'Coleslaw', price: 15 }],                                image_url: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500' },
    { title: 'Halloumi Burger',         description: 'Grilled halloumi with roasted peppers & pesto',     cost: 159, tax_percent: 5, category_id: burgers._id, stock_qty: 24, addons: [],                                                                image_url: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=500' },
    { title: 'Lamb Burger',             description: 'Spiced lamb patty with tzatziki & feta',            cost: 219, tax_percent: 5, category_id: burgers._id, stock_qty: 15, addons: [{ name: 'Extra Feta', price: 25 }],                              image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500' },
    { title: 'Monster Triple Burger',   description: 'Three patties, three cheeses — legendary stack',    cost: 279, tax_percent: 5, category_id: burgers._id, stock_qty: 12, addons: [{ name: 'Fried Onions', price: 20 }],                            image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500' },
    { title: 'Chipotle Burger',         description: 'Smoky chipotle mayo with pepper jack cheese',       cost: 169, tax_percent: 5, category_id: burgers._id, stock_qty: 27, addons: [{ name: 'Extra Chipotle', price: 15 }],                          image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500' },
    { title: 'Butter Chicken Burger',   description: 'Crispy chicken in butter chicken sauce & naan bun', cost: 179, tax_percent: 5, category_id: burgers._id, stock_qty: 33, addons: [{ name: 'Extra Sauce', price: 15 }],                            image_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500' },
    { title: 'Avocado Smash Burger',    description: 'Fresh smashed avocado with lime & chilli flakes',   cost: 189, tax_percent: 5, category_id: burgers._id, stock_qty: 20, addons: [{ name: 'Extra Avo', price: 30 }],                              image_url: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=500' },
    { title: 'Cajun Burger',            description: 'Cajun-spiced beef with remoulade sauce & pickles',  cost: 159, tax_percent: 5, category_id: burgers._id, stock_qty: 25, addons: [{ name: 'Jalapeños', price: 10 }],                              image_url: 'https://images.unsplash.com/photo-1582196016295-f8c8a4a5b8d7?w=500' },
    { title: 'Wagyu Beef Burger',       description: 'Premium Wagyu patty with caramelised onions',       cost: 349, tax_percent: 5, category_id: burgers._id, stock_qty: 8,  addons: [{ name: 'Foie Gras', price: 80 }],                              image_url: 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=500' },
    { title: 'Sriracha Honey Burger',   description: 'Sweet sriracha honey glaze with crispy chicken',   cost: 169, tax_percent: 5, category_id: burgers._id, stock_qty: 30, addons: [{ name: 'Extra Honey', price: 10 }],                             image_url: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=500' },

    // ── Pizza (7) ────────────────────────────────────────────────────────────
    { title: 'Margherita Classic',      description: 'San Marzano tomatoes, fresh mozzarella & basil',    cost: 249, tax_percent: 5,  category_id: pizza._id,   stock_qty: 25, addons: [{ name: 'Extra Mozzarella', price: 40 }],                                image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500' },
    { title: 'Pepperoni Supreme',       description: 'Loaded with pepperoni on tangy tomato base',        cost: 299, tax_percent: 5,  category_id: pizza._id,   stock_qty: 20, addons: [{ name: 'Stuffed Crust', price: 50 }],                                   image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500' },
    { title: 'BBQ Chicken Pizza',       description: 'Smoky BBQ sauce with grilled chicken & onions',     cost: 319, tax_percent: 5,  category_id: pizza._id,   stock_qty: 20, addons: [{ name: 'Extra Chicken', price: 60 }],                                   image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500' },
    { title: 'Four Cheese Pizza',       description: 'Mozzarella, cheddar, parmesan & gorgonzola',        cost: 349, tax_percent: 5,  category_id: pizza._id,   stock_qty: 18, addons: [{ name: 'Truffle Oil', price: 40 }],                                     image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500' },
    { title: 'Paneer Tikka Pizza',      description: 'Spiced paneer chunks on tandoori sauce',            cost: 299, tax_percent: 5,  category_id: pizza._id,   stock_qty: 22, addons: [{ name: 'Extra Paneer', price: 50 }],                                    image_url: 'https://images.unsplash.com/photo-1571066811602-716837d681de?w=500' },
    { title: 'Garden Veggie Pizza',     description: 'Bell peppers, olives, mushrooms & onions',          cost: 249, tax_percent: 5,  category_id: pizza._id,   stock_qty: 30, addons: [],                                                                        image_url: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=500' },
    { title: 'Spicy Arrabbiata Pizza',  description: 'Fiery arrabbiata sauce with Italian sausage',       cost: 329, tax_percent: 5,  category_id: pizza._id,   stock_qty: 15, addons: [{ name: 'Chilli Flakes', price: 10 }],                                   image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500' },

    // ── Cold Drinks (6) ──────────────────────────────────────────────────────
    { title: 'Classic Cola',            description: 'Chilled cola, freshly poured',                       cost:  49, tax_percent: 12, category_id: drinks._id,  stock_qty: 100, addons: [{ name: 'Large Size', price: 20 }],                                     image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500' },
    { title: 'Mango Smoothie',          description: 'Fresh Alphonso mango blended with milk',             cost:  89, tax_percent: 12, category_id: drinks._id,  stock_qty: 60,  addons: [],                                                                      image_url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500' },
    { title: 'Iced Coffee',             description: 'Cold brew with a hint of vanilla',                   cost:  99, tax_percent: 12, category_id: drinks._id,  stock_qty: 50,  addons: [{ name: 'Extra Shot', price: 20 }],                                     image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500' },
    { title: 'Virgin Mojito',           description: 'Lime, mint & soda — refreshing & zesty',            cost:  79, tax_percent: 12, category_id: drinks._id,  stock_qty: 70,  addons: [{ name: 'Extra Mint', price: 10 }],                                     image_url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=500' },
    { title: 'Strawberry Lemonade',     description: 'Fresh strawberries blended with tangy lemon',        cost:  89, tax_percent: 12, category_id: drinks._id,  stock_qty: 45,  addons: [],                                                                      image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500' },
    { title: 'Oreo Milkshake',          description: 'Thick milkshake with crushed Oreo cookies',          cost: 119, tax_percent: 12, category_id: drinks._id,  stock_qty: 35,  addons: [{ name: 'Extra Oreo', price: 15 }],                                     image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500' },

    // ── Sides & Breads (5) ───────────────────────────────────────────────────
    { title: 'Loaded Fries',            description: 'Crispy fries with cheese sauce & jalapeños',         cost:  99, tax_percent: 5,  category_id: sides._id,   stock_qty: 80, addons: [{ name: 'Cheese Dip', price: 20 }],                                      image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
    { title: 'Garlic Bread',            description: 'Toasted bread with herb garlic butter',              cost:  69, tax_percent: 5,  category_id: sides._id,   stock_qty: 70, addons: [{ name: 'Cheese', price: 15 }],                                          image_url: 'https://images.unsplash.com/photo-1619531040576-f9416740661a?w=500' },
    { title: 'Onion Rings',             description: 'Golden crispy onion rings with dipping sauce',       cost:  79, tax_percent: 5,  category_id: sides._id,   stock_qty: 60, addons: [{ name: 'Chipotle Dip', price: 15 }],                                    image_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500' },
    { title: 'Coleslaw',                description: 'Creamy homemade coleslaw with a hint of lemon',      cost:  49, tax_percent: 5,  category_id: sides._id,   stock_qty: 90, addons: [],                                                                        image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=500' },
    { title: 'Peri Peri Fries',         description: 'Fries tossed in our signature peri peri spice',     cost:  89, tax_percent: 5,  category_id: sides._id,   stock_qty: 65, addons: [{ name: 'Extra Dip', price: 10 }],                                       image_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500' },

    // ── Desserts (5) ─────────────────────────────────────────────────────────
    { title: 'Chocolate Lava Cake',     description: 'Warm chocolate cake with molten centre',             cost: 129, tax_percent: 5,  category_id: desserts._id, stock_qty: 30, addons: [{ name: 'Ice Cream Scoop', price: 30 }],                                 image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500' },
    { title: 'New York Cheesecake',     description: 'Classic baked cheesecake with berry compote',        cost: 149, tax_percent: 5,  category_id: desserts._id, stock_qty: 25, addons: [{ name: 'Whipped Cream', price: 20 }],                                   image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500' },
    { title: 'Brownie Sundae',          description: 'Fudgy brownie topped with vanilla ice cream',        cost:  99, tax_percent: 5,  category_id: desserts._id, stock_qty: 35, addons: [{ name: 'Hot Fudge', price: 15 }],                                       image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500' },
    { title: 'Crème Brûlée',           description: 'Classic French custard with caramelised sugar',      cost: 139, tax_percent: 5,  category_id: desserts._id, stock_qty: 20, addons: [],                                                                        image_url: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=500' },
    { title: 'Mango Panna Cotta',       description: 'Italian panna cotta layered with alphonso mango',   cost: 119, tax_percent: 5,  category_id: desserts._id, stock_qty: 20, addons: [{ name: 'Mango Coulis', price: 20 }],                                    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500' },
  ];

  await Product.insertMany(products);
  console.log(`Created ${products.length} products`);
  console.log('\n✅ Seed complete!');
  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });
