import bcrypt from 'bcrypt';

export const encryptPassword = async (password: string) => {
    const encryptedPassword = await bcrypt.hash(password, 8);
    return encryptedPassword;
};

export const isPasswordMatch = async (password: string, userPassword: string) => {
    return await bcrypt.compare(password, userPassword);
};
