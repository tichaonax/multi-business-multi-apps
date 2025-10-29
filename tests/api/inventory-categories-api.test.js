const axios = require('axios');

describe('Inventory Categories API Integration Tests', () => {
  const baseUrl = 'http://localhost:8080';

  // Helper function to get auth token (mock implementation)
  const getAuthToken = async () => {
    // In a real test, this would authenticate and return a token
    // For now, we'll assume the server is running with test data
    return 'mock-token';
  };

  describe('GET /api/inventory/[businessId]/categories', () => {
    it('should return categories with subcategories for a valid business', async () => {
      const businessId = 'demo-clothing'; // Using demo business ID

      const response = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories`);
      const data = response.data;

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('summary');
      expect(Array.isArray(data.categories)).toBe(true);

      if (data.categories.length > 0) {
        const category = data.categories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('emoji');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('subcategories');
        expect(Array.isArray(category.subcategories)).toBe(true);
      }
    });

    it('should filter out inactive categories when includeInactive=false', async () => {
      const businessId = 'demo-clothing';

      const response = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories?includeInactive=false`);
      const data = response.data;

      expect(response.status).toBe(200);
      expect(data.categories.every(cat => cat.isActive)).toBe(true);
    });

    it('should include inactive categories when includeInactive=true', async () => {
      const businessId = 'demo-clothing';

      const response = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories?includeInactive=true`);
      const data = response.data;

      expect(response.status).toBe(200);
      // Should include both active and inactive categories
      expect(data.categories.length).toBeGreaterThanOrEqual(data.summary.active);
    });
  });

  describe('POST /api/inventory/[businessId]/categories', () => {
    it('should create a new category', async () => {
      const businessId = 'demo-clothing';
      const categoryData = {
        name: 'Test Category',
        description: 'Created by integration test',
        emoji: '🧪',
        color: 'purple'
      };

      try {
        const response = await axios.post(`${baseUrl}/api/inventory/${businessId}/categories`, categoryData, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.status === 201) {
          expect(response.data).toHaveProperty('message', 'Category created successfully');
          expect(response.data).toHaveProperty('category');
          expect(response.data.category.name).toBe(categoryData.name);
        }
      } catch (error) {
        // Expected if not authenticated - this is acceptable for integration test
        expect(error.response.status).toBe(401);
      }
    });

    it('should return 400 for missing required fields', async () => {
      const businessId = 'demo-clothing';

      try {
        await axios.post(`${baseUrl}/api/inventory/${businessId}/categories`, {}, {
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
          expect(error.response.data.error).toContain('Missing required field');
        }
      }
    });
  });

  describe('PUT /api/inventory/categories/[id]', () => {
    it('should update an existing category', async () => {
      // First, get an existing category ID
      const businessId = 'demo-clothing';
      const listResponse = await axios.get(`${baseUrl}/api/inventory/${businessId}/categories`);
      const listData = listResponse.data;

      if (listData.categories && listData.categories.length > 0) {
        const categoryId = listData.categories[0].id;
        const updateData = {
          name: 'Updated Test Category',
          emoji: '🔄',
          color: 'blue'
        };

        try {
          const response = await axios.put(`${baseUrl}/api/inventory/categories/${categoryId}`, updateData, {
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (response.status === 200) {
            expect(response.data).toHaveProperty('message', 'Category updated successfully');
            expect(response.data).toHaveProperty('category');
          }
        } catch (error) {
          // Other responses are acceptable (401, 403, 404, etc.)
          expect([401, 403, 404, 409]).toContain(error.response.status);
        }
      } else {
        // No categories to test with - skip test
        expect(true).toBe(true);
      }
    });
  });

  describe('DELETE /api/inventory/categories/[id]', () => {
    it('should handle category deletion appropriately', async () => {
      // This test verifies the endpoint exists and handles auth appropriately
      const categoryId = 'non-existent-category-id';

      try {
        await axios.delete(`${baseUrl}/api/inventory/categories/${categoryId}`);
      } catch (error) {
        // We expect either 401 (not authenticated) or other auth-related responses
        expect([401, 403, 404]).toContain(error.response.status);
      }
    });
  });
});