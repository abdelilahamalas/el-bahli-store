<?php

namespace App\Policies;

use App\Models\ImageProduit;
use App\Models\User;

class ImageProduitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, ImageProduit $image): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, ImageProduit $image): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, ImageProduit $image): bool
    {
        return $user->isAdmin();
    }
}
