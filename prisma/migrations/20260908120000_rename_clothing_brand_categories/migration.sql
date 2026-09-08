-- Renames clothing categories that currently reference SHEIN/Manfinity
-- sub-brand codes or other third-party brand/IP names (Adidas, Nike, Warner
-- Bros., Harry Potter, etc.) to generic, descriptive product-collection
-- names. Verified read-only beforehand: of the 118 brand-referencing names
-- found, 117 have zero BusinessProducts, zero BarcodeInventoryItems, and
-- zero InventorySubcategories referencing them, so renaming those in place
-- carries no data risk. One exception -- 'Gucci Short Sleeve' -- is a real,
-- user-created, business-owned category with a live barcode inventory item
-- attached, so it is deliberately left out of this migration; see
-- review-summary.md for that one to be handled as its own decision.
--
-- Brand/product tracking (when real branded inventory is entered) belongs on
-- BusinessBrands / BusinessProducts.brandId instead of in the category name
-- going forward -- that mechanism already exists and is untouched here.
--
-- Idempotent -- safe to re-run (sets the same value again if already applied).
-- Must run BEFORE the category-grouping migration that follows it, since
-- that migration matches these rows by their NEW name.

UPDATE business_categories SET name = 'General Apparel Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN collection';
UPDATE business_categories SET name = 'Plus Size Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shein Curve+';
UPDATE business_categories SET name = 'Everyday Basics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Basic living';
UPDATE business_categories SET name = 'Designer Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Forever 21 x SHEIN X';
UPDATE business_categories SET name = 'Men''s Nightlife Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity AFTRDRK';
UPDATE business_categories SET name = 'Men''s Athletic Prep Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity AthPrep';
UPDATE business_categories SET name = 'Men''s Basics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Basics';
UPDATE business_categories SET name = 'Men''s Casual Comfort Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Chillmode';
UPDATE business_categories SET name = 'Men''s Emerging Trends Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity EMRG';
UPDATE business_categories SET name = 'Men''s Essentials Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Homme';
UPDATE business_categories SET name = 'Men''s Streetwear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Hypemode';
UPDATE business_categories SET name = 'Men''s Statement Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity LEGND';
UPDATE business_categories SET name = 'Men''s Contemporary Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Mode';
UPDATE business_categories SET name = 'Men''s Resort Wear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity RSRT';
UPDATE business_categories SET name = 'Men''s Athletic Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Sporsity';
UPDATE business_categories SET name = 'Men''s Smart Athletic Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Sport Polished';
UPDATE business_categories SET name = 'Men''s Street Style Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity StreetEZ';
UPDATE business_categories SET name = 'Unisex Apparel Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity Unisex';
UPDATE business_categories SET name = 'Men''s Urban Casual Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity UrbanChill';
UPDATE business_categories SET name = 'Men''s Vacation Wear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Manfinity VCAY';
UPDATE business_categories SET name = 'Women''s Contemporary Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Aloruh';
UPDATE business_categories SET name = 'Women''s Trendy Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN BAE';
UPDATE business_categories SET name = 'Women''s Basics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Basics';
UPDATE business_categories SET name = 'Women''s Everyday Basics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN BASICS';
UPDATE business_categories SET name = 'Women''s Elegant Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Belle';
UPDATE business_categories SET name = 'Women''s Refined Elegant Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN BELLE';
UPDATE business_categories SET name = 'Women''s Workwear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Bizwear';
UPDATE business_categories SET name = 'Women''s Business Casual Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN BIZwear';
UPDATE business_categories SET name = 'Women''s Bohemian Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN BohoFeels';
UPDATE business_categories SET name = 'Women''s Classic Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Clasi';
UPDATE business_categories SET name = 'Women''s General Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Collection';
UPDATE business_categories SET name = 'Women''s Casual Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Coolane';
UPDATE business_categories SET name = 'Women''s Cottagecore Loungewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN CottageSlumber';
UPDATE business_categories SET name = 'Plus Size Curve Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN CURVE+';
UPDATE business_categories SET name = 'Plus Size Collection (DD+)', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN DD+';
UPDATE business_categories SET name = 'Women''s Decades-Inspired Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN DECDS';
UPDATE business_categories SET name = 'Women''s Shapewear-Inspired Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN DesireSculpt';
UPDATE business_categories SET name = 'Women''s Global Print Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN EastFlair';
UPDATE business_categories SET name = 'Women''s Modern Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Eraneu';
UPDATE business_categories SET name = 'Women''s Essentials Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Essnce';
UPDATE business_categories SET name = 'Licensed Graphic Apparel Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Fandom Graphics';
UPDATE business_categories SET name = 'Women''s Parisian Style Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Frenchy';
UPDATE business_categories SET name = 'Women''s Haute Fashion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Haute';
UPDATE business_categories SET name = 'Women''s Haute Couture-Inspired Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN HAUTE';
UPDATE business_categories SET name = 'Women''s Statement Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN ICON';
UPDATE business_categories SET name = 'Women''s Feminine Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Lady';
UPDATE business_categories SET name = 'Women''s Leisurewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Leisure';
UPDATE business_categories SET name = 'Women''s Evening Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN LUNE';
UPDATE business_categories SET name = 'Women''s Luxe Evening Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN LuxeNights';
UPDATE business_categories SET name = 'Women''s Modern Contemporary Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Maija';
UPDATE business_categories SET name = 'Maternity Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Maternity';
UPDATE business_categories SET name = 'Women''s Mod Style Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN MOD';
UPDATE business_categories SET name = 'Women''s Relaxed Casual Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Mulvari';
UPDATE business_categories SET name = 'Women''s Modest Wear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Najma';
UPDATE business_categories SET name = 'Petite Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN PetitDoll';
UPDATE business_categories SET name = 'Petite Fit Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN PETITE';
UPDATE business_categories SET name = 'Women''s Retro Glam Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN PinupGlam';
UPDATE business_categories SET name = 'Women''s Premium Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN privé';
UPDATE business_categories SET name = 'Women''s Sculpting Shapewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Shape';
UPDATE business_categories SET name = 'Women''s Silky Fabrics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN SilkySpell';
UPDATE business_categories SET name = 'Women''s Bold Trendy Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Slayr';
UPDATE business_categories SET name = 'Women''s Court Sports Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport CourtClass';
UPDATE business_categories SET name = 'Women''s Easy Activewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Easify';
UPDATE business_categories SET name = 'Women''s Innovative Activewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Innovista';
UPDATE business_categories SET name = 'Women''s Active Lifestyle Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Lifespree';
UPDATE business_categories SET name = 'Women''s Seamless Activewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Seamluxe';
UPDATE business_categories SET name = 'Women''s Yoga Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Slayoga';
UPDATE business_categories SET name = 'Women''s Street Activewear Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Sport Streetz';
UPDATE business_categories SET name = 'Swimwear Basics Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Basics';
UPDATE business_categories SET name = 'Swimwear Resort Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Chicsea';
UPDATE business_categories SET name = 'Swimwear Occasion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Event';
UPDATE business_categories SET name = 'Swimwear Beach Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Lushore';
UPDATE business_categories SET name = 'Swimwear Modern Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim MOD';
UPDATE business_categories SET name = 'Swimwear Casual Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Mulvari';
UPDATE business_categories SET name = 'Swimwear Sporty Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim SPRTY';
UPDATE business_categories SET name = 'Swimwear Glam Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim SXY';
UPDATE business_categories SET name = 'Swimwear Vacation Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Swim Vcay';
UPDATE business_categories SET name = 'Women''s Glam Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN SXY';
UPDATE business_categories SET name = 'Tall Fit Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN TALL';
UPDATE business_categories SET name = 'Women''s Travel Chic Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN TRVLCHIC';
UPDATE business_categories SET name = 'Women''s Varsity Style Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN VARSITIE';
UPDATE business_categories SET name = 'Women''s Vacation Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN Vcay';
UPDATE business_categories SET name = 'Women''s Resort Vacation Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN VCAY';
UPDATE business_categories SET name = 'Women''s Getaway Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN WYWH';
UPDATE business_categories SET name = 'Boutique Designer Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN X Alice McCall';
UPDATE business_categories SET name = 'Artist Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN X Artists';
UPDATE business_categories SET name = 'Multi-Designer Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN X Designers';
UPDATE business_categories SET name = 'Graphic Artist Collaboration Collection II', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN X GAWX II';
UPDATE business_categories SET name = 'Premium Designer Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEIN X MONSE';
UPDATE business_categories SET name = 'Curated Designer Collaboration Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sheincollabs';
UPDATE business_categories SET name = 'Women''s New Arrivals Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEINNeu';
UPDATE business_categories SET name = 'Licensed Character Graphic Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'TOM and JERRY X SHEIN X Artist';
UPDATE business_categories SET name = 'Performance Athletic Footwear and Apparel', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Adidas';
UPDATE business_categories SET name = 'Athletic Training Footwear and Apparel', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nike';
UPDATE business_categories SET name = 'Sport Casual Footwear and Apparel', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Puma';
UPDATE business_categories SET name = 'Classic Athletic Footwear and Apparel', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'New Balance';
UPDATE business_categories SET name = 'Contemporary Fashion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Forever 21';
UPDATE business_categories SET name = 'Contemporary Women''s Fashion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'MISSGUIDED';
UPDATE business_categories SET name = 'Trendy Women''s Fashion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'ROMWE';
UPDATE business_categories SET name = 'Personal Care Styling Appliances', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Panasonic';
UPDATE business_categories SET name = 'Personal Grooming Styling Appliances', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Philips';
UPDATE business_categories SET name = 'Oral Care Essentials', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oral-B';
UPDATE business_categories SET name = 'Small Kitchen Appliances', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Comfee';
UPDATE business_categories SET name = 'Home and Outdoor Furniture', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costway';
UPDATE business_categories SET name = 'Indoor and Outdoor Furniture', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Homcom';
UPDATE business_categories SET name = 'Everyday Contemporary Fashion Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Newchic';
UPDATE business_categories SET name = 'Home Cleaning Appliances', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tineco';
UPDATE business_categories SET name = 'Teeth Whitening Oral Care', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hismile';
UPDATE business_categories SET name = 'Licensed Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Warner Bros.';
UPDATE business_categories SET name = 'Licensed Fantasy Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Harry Potter';
UPDATE business_categories SET name = 'Licensed Art and Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Frida Kahlo';
UPDATE business_categories SET name = 'Licensed Kids Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Care Bears';
UPDATE business_categories SET name = 'Licensed Anime Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cardcaptor Sakura';
UPDATE business_categories SET name = 'Licensed Retro Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Strawberry Shortcake';
UPDATE business_categories SET name = 'Licensed Animated Character Merchandise', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'The Powerpuff Girls';
UPDATE business_categories SET name = 'Salon Hair Care', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kerastase';
UPDATE business_categories SET name = 'Women''s Makeup Collection', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SHEGLAM';
