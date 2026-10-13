<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesCustomer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company',
        'company_name',
        'email',
        'phone',
        'city',
        'status',
        'total_spend',
        'account_manager_id',
        'user_id',
        'portal_access_enabled',
    ];

    protected static function booted(): void
    {
        static::saving(function (SalesCustomer $customer) {
            if (empty($customer->company_name) && !empty($customer->company)) {
                $customer->company_name = $customer->company;
            } elseif (empty($customer->company) && !empty($customer->company_name)) {
                $customer->company = $customer->company_name;
            }
        });
    }

    public function getCompanyNameAttribute(?string $value): ?string
    {
        return $value ?: ($this->attributes['company'] ?? $this->name);
    }

    protected $casts = [
        'total_spend' => 'decimal:2',
        'portal_access_enabled' => 'boolean',
    ];

    public function projects()
    {
        return $this->hasMany(AgencyProject::class, 'client_id');
    }

    public function accountManager()
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function portalUser()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function invitations()
    {
        return $this->hasMany(ClientPortalInvitation::class, 'client_id');
    }

    public function leads()
    {
        return $this->hasMany(SalesLead::class, 'customer_id');
    }

    public function invoices()
    {
        return $this->hasMany(SalesInvoice::class, 'customer_id');
    }

    public function contacts()
    {
        return $this->hasMany(ClientContact::class, 'client_id');
    }
}

