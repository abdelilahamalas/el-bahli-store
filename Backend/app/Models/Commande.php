<?php

namespace App\Models;

/**
 * Alias de nomenclature française pour Order.
 */
class Commande extends Order
{
    protected $table = 'orders';
}
