<?php

namespace App\Policies;

use App\Models\ProductSize;
use App\Models\User;

class ProductSizePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, ProductSize $size): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, ProductSize $size): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, ProductSize $size): bool
    {
        return $user->isAdmin();
    }
}
