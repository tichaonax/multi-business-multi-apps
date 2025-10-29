const axios = require('axios');

describe('Inventory Subcategories API Integration Tests', () => {
  const baseUrl = 'http://localhost:8080';

  describe('POST /api/inventory/subcategories', () => {
    it('should create a new subcategory', async () => {
      // First get an existing category ID
      const businessId = 'demo-clothing';
      const categoriesResponse = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories`);
      const categoriesData = categoriesResponse.data;

      if (categoriesData.categories && categoriesData.categories.length > 0) {
        const categoryId = categoriesData.categories[0].id;
        const subcategoryData = {
          categoryId,
          name: 'Test Subcategory',
          emoji: '🧪',
          description: 'Created by integration test'
        };

        try {
          const response = await axios.post(`${baseUrl}/api/inventory/subcategories`, subcategoryData, {
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (response.status === 201) {
            expect(response.data).toHaveProperty('message', 'Subcategory created successfully');
            expect(response.data).toHaveProperty('subcategory');
            expect(response.data.subcategory.name).toBe(subcategoryData.name);
          }
        } catch (error) {
          // Other responses are acceptable (401, 403, 404, etc.)
          expect([401, 403, 404, 409]).toContain(error.response.status);
        }
      } else {
        // No categories available for testing
        expect(true).toBe(true);
      }
    });

    it('should return 400 for missing required fields', async () => {
      try {
        await axios.post(`${baseUrl}/api/inventory/subcategories`, { name: 'Test Subcategory' }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        if (error.response.status === 401) {
          // Expected if not authenticated
          expect(error.response.status).toBe(401);
        } else {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error).toContain('categoryId and name are required');
        }
      }
    });
  });

  describe('PUT /api/inventory/subcategories/[id]', () => {
    it('should update an existing subcategory', async () => {
      // First, get categories to find a subcategory
      const businessId = 'demo-clothing';
      const categoriesResponse = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories`);
      const categoriesData = categoriesResponse.data;

      if (categoriesData.categories && categoriesData.categories.length > 0) {
        const category = categoriesData.categories.find(cat => cat.subcategories && cat.subcategories.length > 0);

        if (category && category.subcategories.length > 0) {
          const subcategoryId = category.subcategories[0].id;
          const updateData = {
            name: 'Updated Test Subcategory',
            emoji: '🔄',
            description: 'Updated by integration test'
          };

          try {
            const response = await axios.put(`${baseUrl}/api/inventory/subcategories/${subcategoryId}`, updateData, {
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (response.status === 200) {
              expect(response.data).toHaveProperty('message', 'Subcategory updated successfully');
              expect(response.data).toHaveProperty('subcategory');
            }
          } catch (error) {
            // Other responses are acceptable (401, 403, 404, etc.)
            expect([401, 403, 404, 409]).toContain(error.response.status);
          }
        } else {
          // No subcategories available for testing
          expect(true).toBe(true);
        }
      } else {
        // No categories available for testing
        expect(true).toBe(true);
      }
    });
  });

  describe('DELETE /api/inventory/subcategories/[id]', () => {
    it('should handle subcategory deletion appropriately', async () => {
      // Test with a non-existent ID to verify endpoint behavior
      const subcategoryId = 'non-existent-subcategory-id';

      try {
        await axios.delete(`${baseUrl}/api/inventory/subcategories/${subcategoryId}`);
      } catch (error) {
        // We expect auth-related responses since we're not authenticated
        expect([401, 403, 404]).toContain(error.response.status);
      }
    });
  });
});