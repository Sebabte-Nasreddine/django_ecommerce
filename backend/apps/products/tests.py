from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.products.models import Product, Category, Review

User = get_user_model()


class ReviewModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.category = Category.objects.create(
            name="Test Cat",
            slug="test-cat",
        )
        self.product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="A test product",
            price=1000,
            category=self.category,
        )

    def test_create_review(self):
        review = Review.objects.create(
            product=self.product,
            user=self.user,
            rating=5,
            comment="Excellent !",
        )
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.comment, "Excellent !")
        self.assertTrue(review.is_active)
        self.assertIn(str(review), [
            f"{self.user.first_name}: {review.rating}/5 - {self.product.name}",
        ])

    def test_unique_review_per_user_product(self):
        Review.objects.create(product=self.product, user=self.user, rating=4)
        with self.assertRaises(Exception):
            Review.objects.create(product=self.product, user=self.user, rating=3)

    def test_default_is_active(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=5)
        self.assertTrue(review.is_active)

    def test_rating_range(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=1)
        self.assertEqual(review.rating, 1)
        review.rating = 5
        review.save()
        self.assertEqual(review.rating, 5)
