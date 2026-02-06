insert into listings (title, price, currency, year, mileage_km, fuel, transmission, power_kw, location, images, seller_name, seller_type, body, color, drive, doors, seats, description, features)
values
  (
      '2022 Audi Q5 45 TFSI quattro',
    45900,
    'EUR',
    2022,
    18500,
    'Petrol',
    'Automatic',
    195,
    'Munich, DE',
    array[
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=60&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493238792000-8113da705763?q=60&w=1600&auto=format&fit=crop'
    ],
    'Bavarian Autohaus',
    'Dealer',
    'SUV',
    'Daytona Gray',
    'AWD',
    5,
    5,
    'One-owner Q5 with premium plus package and panoramic roof.',
    array['Panoramic roof', 'Matrix LED', 'Adaptive cruise']
  ),
  (
    '2021 BMW 330e M Sport',
    38900,
    'EUR',
    2021,
    26500,
    'Plug-in Hybrid',
    'Automatic',
    215,
    'Hamburg, DE',
    array[
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=60&w=1600&auto=format&fit=crop'
    ],
    'Nordic Mobility',
    'Dealer',
    'Sedan',
    'Mineral White',
    'RWD',
    4,
    5,
    'M Sport with HUD and extended warranty.',
    array['HUD', 'Harman Kardon']
  );
