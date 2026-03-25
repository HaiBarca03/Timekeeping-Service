import { Company } from 'src/modules/master-data/entities/company.entity';
import { DataSource } from 'typeorm';

export const seedCompanies = async (dataSource: DataSource) => {
    const companyRepository = dataSource.getRepository(Company);

    const companiesData = [
        {
            originId: 'LMONNKZO7X',
            companyName: 'Công ty cổ phần Staaar',
        },
        {
            originId: 'LED1Z523PX',
            companyName: 'Công ty TNHH Xuất nhập khẩu HSH Việt Nam',
        },
        {
            originId: 'KC0LEGNPX0',
            companyName: 'Công ty Cổ phần Winning & Co',
        },
        {
            originId: 'DA0GCLMLND',
            companyName: 'Công ty cổ phần Intellife',
        },
    ];

    console.log('--- Seeding Companies ---');

    for (const data of companiesData) {
        // Sử dụng upsert để tránh lỗi nếu chạy lại script (dựa trên origin_id duy nhất)
        const existing = await companyRepository.findOne({
            where: { originId: data.originId },
        });

        if (!existing) {
            const newCompany = companyRepository.create({
                originId: data.originId,
                companyName: data.companyName,
                // created_at, updated_at sẽ tự sinh nếu BaseEntity có @CreateDateColumn
            });
            await companyRepository.save(newCompany);
            console.log(`✅ Created: ${data.companyName}`);
        } else {
            console.log(`ℹ️ Skipped: ${data.companyName} (Already exists)`);
        }
    }

    console.log('--- Seeding Completed ---');
};