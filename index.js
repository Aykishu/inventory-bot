const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const Database = require('better-sqlite3');
const express = require('express');

const app = express();

// ================= WEB SERVER =================

app.get('/', (req, res) => {
    res.send('Hells Legion Inventory Online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web server lancé.');
});

// ================= CONFIG =================

const config = {
    token: process.env.TOKEN,

    clientId: "1507287568440627261",
    guildId: "1478420890051018765",

    allowedRoles: [
        "Président",
        "Vice-président",
        "Sergent d'armes",
        "Trésorier",
        "Secrétaire"
    ],

    logChannelName: "📦・│stockage"
};

// ================= CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= DATABASE =================

const db = new Database('stocks.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS stocks (
    item TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,
    category TEXT NOT NULL
)
`).run();

console.log("✅ SQLite connecté.");

// ================= CATEGORIES =================

const categories = {
    ressources: "🔨 Ressources",
    medical: "💊 Médical",
    armes: "🔫 Armurerie",
    vehicules: "🚗 Véhicules",
    nourriture: "🍔 Nourriture",
    divers: "📦 Divers"
};

// ================= COMMANDES =================

const commands = [

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Ouvrir le panel inventaire')

].map(command => command.toJSON());

// ================= REGISTER =================

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
            { body: commands }
        );

        console.log("✅ Commandes enregistrées.");

    } catch (err) {

        console.error(err);

    }

})();

// ================= READY =================

client.once('ready', () => {

    console.log(`✅ ${client.user.tag} connecté.`);

});

// ================= PERMISSIONS =================

function hasPermission(interaction) {

    return interaction.member.roles.cache.some(
        role => config.allowedRoles.includes(role.name)
    );

}

// ================= LOGS =================

function sendLog(interaction, message) {

    const logsChannel = interaction.guild.channels.cache.find(
        c => c.name === config.logChannelName
    );

    if (logsChannel) {
        logsChannel.send(message);
    }

}

// ================= EMBED =================

function createMainEmbed() {

    const totalItems = db.prepare(
        `SELECT COUNT(*) as count FROM stocks`
    ).get().count;

    const totalQuantity = db.prepare(
        `SELECT SUM(quantity) as total FROM stocks`
    ).get().total || 0;

    return new EmbedBuilder()
        .setTitle('📦 HELLS LEGION • INVENTAIRE')
        .setDescription(`
Bienvenue dans le système de stockage.

🔨 Ressources
💊 Médical
🔫 Armurerie
🚗 Véhicules
🍔 Nourriture
📦 Divers
`)
        .addFields({
            name: '📊 Statistiques',
            value:
`📦 Items : ${totalItems}
📈 Quantité totale : ${totalQuantity}`
        })
        .setColor('#8B0000')
        .setFooter({
            text: 'Inventory System V5'
        });

}

// ================= BOUTONS =================

function createButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('view_stock')
                    .setLabel('Voir Stock')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('refresh_stock')
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)

            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setLabel('Ajouter')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('remove_stock')
                    .setLabel('Retirer')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('delete_stock')
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('search_stock')
                    .setLabel('Rechercher')
                    .setEmoji('🔍')
                    .setStyle(ButtonStyle.Primary)

            )

    ];

}

// ================= MENU =================

function createCategoryMenu() {

    return new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId('category_select')
                .setPlaceholder('📂 Choisir une catégorie')
                .addOptions([
                    {
                        label: 'Ressources',
                        value: 'ressources',
                        emoji: '🔨'
                    },
                    {
                        label: 'Médical',
                        value: 'medical',
                        emoji: '💊'
                    },
                    {
                        label: 'Armurerie',
                        value: 'armes',
                        emoji: '🔫'
                    },
                    {
                        label: 'Véhicules',
                        value: 'vehicules',
                        emoji: '🚗'
                    },
                    {
                        label: 'Nourriture',
                        value: 'nourriture',
                        emoji: '🍔'
                    },
                    {
                        label: 'Divers',
                        value: 'divers',
                        emoji: '📦'
                    }
                ])

        );

}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    // ================= COMMANDES =================

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'inventaire') {

            return interaction.reply({
                embeds: [createMainEmbed()],
                components: [
                    ...createButtons(),
                    createCategoryMenu()
                ]
            });

        }

    }

    // ================= BOUTONS =================

    if (interaction.isButton()) {

        // ================= VOIR STOCK =================

        if (interaction.customId === 'view_stock') {

            const rows = db.prepare(`
                SELECT * FROM stocks
                ORDER BY category ASC, item ASC
            `).all();

            if (rows.length === 0) {

                return interaction.reply({
                    content: '📦 Aucun stock enregistré.',
                    ephemeral: true
                });

            }

            let description = '';

            rows.forEach(row => {

                description += `
${categories[row.category] || '📦'} **${row.item}**
└ 📦 ${row.quantity}

`;

            });

            const embed = new EmbedBuilder()
                .setTitle('📦 STOCK COMPLET')
                .setDescription(description)
                .setColor('#8B0000');

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        }

        // ================= REFRESH =================

        if (interaction.customId === 'refresh_stock') {

            return interaction.update({
                embeds: [createMainEmbed()],
                components: [
                    ...createButtons(),
                    createCategoryMenu()
                ]
            });

        }

        // ================= AJOUTER =================

        if (interaction.customId === 'add_stock') {

            const modal = new ModalBuilder()
                .setCustomId('add_stock_modal')
                .setTitle('📥 Ajouter un item');

            const objetInput = new TextInputBuilder()
                .setCustomId('objet')
                .setLabel('Nom de l’objet')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantiteInput = new TextInputBuilder()
                .setCustomId('quantite')
                .setLabel('Quantité')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const categorieInput = new TextInputBuilder()
                .setCustomId('categorie')
                .setLabel('Catégorie')
                .setPlaceholder('ressources / medical / armes...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(objetInput),
                new ActionRowBuilder().addComponents(quantiteInput),
                new ActionRowBuilder().addComponents(categorieInput)
            );

            return await interaction.showModal(modal);

        }

        // ================= RETIRER =================

        if (interaction.customId === 'remove_stock') {

            const modal = new ModalBuilder()
                .setCustomId('remove_stock_modal')
                .setTitle('📤 Retirer un item');

            const objetInput = new TextInputBuilder()
                .setCustomId('objet')
                .setLabel('Nom de l’objet')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantiteInput = new TextInputBuilder()
                .setCustomId('quantite')
                .setLabel('Quantité')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(objetInput),
                new ActionRowBuilder().addComponents(quantiteInput)
            );

            return await interaction.showModal(modal);

        }

        // ================= SUPPRIMER =================

        if (interaction.customId === 'delete_stock') {

            const modal = new ModalBuilder()
                .setCustomId('delete_stock_modal')
                .setTitle('🗑️ Supprimer un item');

            const objetInput = new TextInputBuilder()
                .setCustomId('objet')
                .setLabel('Nom de l’objet')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(objetInput)
            );

            return await interaction.showModal(modal);

        }

        // ================= RECHERCHER =================

        if (interaction.customId === 'search_stock') {

            const modal = new ModalBuilder()
                .setCustomId('search_stock_modal')
                .setTitle('🔍 Rechercher un item');

            const objetInput = new TextInputBuilder()
                .setCustomId('objet')
                .setLabel('Nom de l’objet')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(objetInput)
            );

            return await interaction.showModal(modal);

        }

    }

    // ================= MENU CATEGORIES =================

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'category_select') {

            const category = interaction.values[0];

            const rows = db.prepare(`
                SELECT * FROM stocks
                WHERE category = ?
                ORDER BY item ASC
            `).all(category);

            let description = '';

            if (rows.length === 0) {

                description = '📦 Aucun item dans cette catégorie.';

            } else {

                rows.forEach(row => {

                    description += `
📦 **${row.item}**
└ Quantité : ${row.quantity}

`;

                });

            }

            const embed = new EmbedBuilder()
                .setTitle(`${categories[category]}`)
                .setDescription(description)
                .setColor('#8B0000');

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        }

    }

    // ================= MODALS =================

    if (interaction.isModalSubmit()) {

        // ================= AJOUTER =================

        if (interaction.customId === 'add_stock_modal') {

            const objet = interaction.fields.getTextInputValue('objet');
            const quantite = parseInt(
                interaction.fields.getTextInputValue('quantite')
            );

            const categorie = interaction.fields
                .getTextInputValue('categorie')
                .toLowerCase();

            const item = db.prepare(
                `SELECT * FROM stocks WHERE item = ?`
            ).get(objet);

            if (item) {

                db.prepare(`
                    UPDATE stocks
                    SET quantity = ?
                    WHERE item = ?
                `).run(item.quantity + quantite, objet);

            } else {

                db.prepare(`
                    INSERT INTO stocks(item, quantity, category)
                    VALUES(?, ?, ?)
                `).run(objet, quantite, categorie);

            }

            const embed = new EmbedBuilder()
                .setTitle('📥 STOCK AJOUTÉ')
                .setDescription(`
📦 Item : **${objet}**
➕ Quantité : **${quantite}**
📂 Catégorie : **${categorie}**
`)
                .setColor('Green');

            interaction.reply({
                embeds: [embed]
            });

            sendLog(
                interaction,
                `📥 ${interaction.user.username} a ajouté ${quantite} ${objet}`
            );

        }

        // ================= RETIRER =================

        if (interaction.customId === 'remove_stock_modal') {

            const objet = interaction.fields.getTextInputValue('objet');
            const quantite = parseInt(
                interaction.fields.getTextInputValue('quantite')
            );

            const item = db.prepare(
                `SELECT * FROM stocks WHERE item = ?`
            ).get(objet);

            if (!item) {

                return interaction.reply({
                    content: '❌ Item introuvable.',
                    ephemeral: true
                });

            }

            let newQuantity = item.quantity - quantite;

            if (newQuantity < 0) {
                newQuantity = 0;
            }

            db.prepare(`
                UPDATE stocks
                SET quantity = ?
                WHERE item = ?
            `).run(newQuantity, objet);

            const embed = new EmbedBuilder()
                .setTitle('📤 STOCK RETIRÉ')
                .setDescription(`
📦 Item : **${objet}**
➖ Quantité : **${quantite}**
📉 Nouveau stock : **${newQuantity}**
`)
                .setColor('Red');

            interaction.reply({
                embeds: [embed]
            });

            sendLog(
                interaction,
                `📤 ${interaction.user.username} a retiré ${quantite} ${objet}`
            );

        }

        // ================= SUPPRIMER =================

        if (interaction.customId === 'delete_stock_modal') {

            const objet = interaction.fields.getTextInputValue('objet');

            db.prepare(`
                DELETE FROM stocks
                WHERE item = ?
            `).run(objet);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ ITEM SUPPRIMÉ')
                .setDescription(`📦 ${objet} supprimé du stock.`)
                .setColor('DarkRed');

            interaction.reply({
                embeds: [embed]
            });

            sendLog(
                interaction,
                `🗑️ ${interaction.user.username} a supprimé ${objet}`
            );

        }

        // ================= RECHERCHE =================

        if (interaction.customId === 'search_stock_modal') {

            const objet = interaction.fields.getTextInputValue('objet');

            const item = db.prepare(`
                SELECT * FROM stocks
                WHERE item LIKE ?
            `).get(`%${objet}%`);

            if (!item) {

                return interaction.reply({
                    content: '❌ Aucun item trouvé.',
                    ephemeral: true
                });

            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ITEM TROUVÉ')
                .setDescription(`
📦 Item : **${item.item}**
📊 Quantité : **${item.quantity}**
📂 Catégorie : **${categories[item.category]}**
`)
                .setColor('Blue');

            interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        }

    }

});

// ================= LOGIN =================

client.login(config.token);