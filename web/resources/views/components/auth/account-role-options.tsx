import { registrationRoles, type RegistrationRole } from '@/components/auth/registration-form';

export default function AccountRoleOptions({
    value: selected,
    onChange,
    disabled = false,
}: {
    value: string;
    onChange: (role: RegistrationRole) => void;
    disabled?: boolean;
}) {
    return (
        <fieldset disabled={disabled} className="auth-reference-roles">
            <legend className="sr-only">Account type</legend>
            {registrationRoles.map(({ value, title, icon: Icon }) => (
                <label key={value} className={'registration-role-card auth-reference-role ' + (selected === value ? 'is-selected' : '')}>
                    <input type="radio" name="account_type" value={value} checked={selected === value} onChange={() => onChange(value)} />
                    <span className="auth-reference-role-icon">
                        <Icon aria-hidden="true" />
                    </span>
                    <span className="auth-reference-role-copy">
                        <strong>{title}</strong>
                        <span>
                            {value === 'buyer'
                                ? 'Shop products, place orders, and track deliveries.'
                                : value === 'seller'
                                  ? 'Sell your products and manage your store.'
                                  : value === 'rider'
                                    ? 'Pick up and deliver parcels in your assigned area.'
                                    : 'Manage deliveries, riders, and logistics operations.'}
                        </span>
                    </span>
                </label>
            ))}
        </fieldset>
    );
}
